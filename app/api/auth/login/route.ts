import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";

const LoginSchema = z.object({
  username: z.string().min(1).max(24),
  password: z.string().min(1).max(72),
});

const attempts = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(key: string, max = 8, windowMs = 60_000) {
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
  if (isRateLimited(`login:${ip}`)) {
    return NextResponse.json({ error: "تلاش‌های زیاد برای ورود. کمی صبر کن." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات وارد شده معتبر نیست." }, { status: 400 });
  }
  const { username, password } = parsed.data;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, username, is_active, password_change_required")
    .ilike("username", username)
    .maybeSingle();

  if (!profile || !profile.is_active) {
    return NextResponse.json({ error: "نام کاربری یا رمز عبور اشتباه است." }, { status: 401 });
  }

  const internalEmail = `${profile.username.toLowerCase()}@z.local`;

  const cookieStore = cookies();
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

  const { error } = await supabase.auth.signInWithPassword({ email: internalEmail, password });
  if (error) {
    return NextResponse.json({ error: "نام کاربری یا رمز عبور اشتباه است." }, { status: 401 });
  }

  await admin.from("user_presence").upsert({ user_id: profile.id, status: "online", last_seen_at: new Date().toISOString() });
  await admin.from("profile_security_info").upsert({
    user_id: profile.id,
    last_login_ip: ip !== "unknown" ? ip : null,
    device_id: cookieStore.get("z_device")?.value ?? null,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true, passwordChangeRequired: profile.password_change_required });
}
