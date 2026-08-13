import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "invalid characters"),
  password: z.string().min(8).max(72),
});

// Simple in-memory rate limit per IP (spec §44). For multi-instance
// deployments, replace with a Redis/Upstash-backed limiter.
const attempts = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(key: string, max = 5, windowMs = 60_000) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(`register:${ip}`)) {
    return NextResponse.json({ error: "درخواست‌های زیاد. کمی بعد دوباره تلاش کن." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات وارد شده معتبر نیست." }, { status: 400 });
  }
  const { username, password } = parsed.data;

  const cookieStore = cookies(); // used both for the device-id read below and the sign-in write further down
  const deviceId = cookieStore.get("z_device")?.value ?? null;

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "این نام کاربری قبلاً استفاده شده است." }, { status: 409 });
  }

  const internalEmail = `${username.toLowerCase()}@z.local`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: internalEmail,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (createError || !created?.user) {
    return NextResponse.json({ error: "امکان ساخت حساب وجود ندارد." }, { status: 500 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    username,
    display_name: username,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id); // rollback
    return NextResponse.json({ error: "خطا در ساخت پروفایل." }, { status: 500 });
  }

  // IP + device id go in profile_security_info, NOT profiles — see the
  // comment in migration 0007 for why: profiles is publicly readable by
  // design, this table deliberately isn't.
  await admin.from("profile_security_info").insert({
    user_id: created.user.id,
    registration_ip: ip !== "unknown" ? ip : null,
    last_login_ip: ip !== "unknown" ? ip : null,
    device_id: deviceId,
  });

  await admin.from("user_settings").insert({ user_id: created.user.id });
  await admin.from("user_presence").insert({ user_id: created.user.id });

  // Notify every admin/super_admin so a real person reviews new members
  // (spec: "هر کسی که عضو جدید می‌شود یک نوتیفیکیشن برای مدیر بیاید").
  // Best-effort: a failure here must never block the person from finishing
  // registration, so errors are swallowed rather than surfaced to them.
  try {
    const { data: admins } = await admin.from("profiles").select("id").in("role", ["admin", "super_admin"]);
    if (admins && admins.length > 0) {
      await admin.from("notifications").insert(
        admins.map((a) => ({
          recipient_id: a.id,
          actor_id: created.user.id,
          type: "new_member",
        }))
      );
    }
  } catch {
    /* non-fatal — see comment above */
  }

  // Sign the new user in immediately by exchanging credentials via the
  // server client so the session cookie is set on this response.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => cookieStore.set({ name, value, ...options }),
        remove: (name, options) => cookieStore.set({ name, value: "", ...options }),
      },
    }
  );
  await supabase.auth.signInWithPassword({ email: internalEmail, password });

  return NextResponse.json({ ok: true });
}
