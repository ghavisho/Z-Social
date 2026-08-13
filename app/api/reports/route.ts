import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  targetType: z.enum(["user", "post", "comment", "message", "moment"]),
  targetId: z.string().uuid(),
  reason: z.string().min(3).max(500),
});

const attempts = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(key: string, max = 10, windowMs = 3_600_000) {
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
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "وارد نشده‌ای." }, { status: 401 });

  if (isRateLimited(`report:${user.id}`)) {
    return NextResponse.json({ error: "تعداد گزارش‌های تو در این ساعت زیاد بوده." }, { status: 429 });
  }

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ورودی نامعتبر است." }, { status: 400 });

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
  });
  if (error) return NextResponse.json({ error: "ثبت گزارش ناموفق بود." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
