import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  profile_visibility: z.enum(["public", "friends", "private"]).optional(),
  who_can_message: z.enum(["everyone", "friends", "nobody"]).optional(),
  who_can_send_friend_request: z.enum(["everyone", "nobody"]).optional(),
  show_online_status: z.boolean().optional(),
  show_last_seen: z.boolean().optional(),
  moment_visibility: z.enum(["public", "friends", "private"]).optional(),
});

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "وارد نشده‌ای." }, { status: 401 });

  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "خطا در بارگذاری تنظیمات." }, { status: 500 });

  // Row might not exist yet for accounts created before user_settings had a
  // default row inserted at registration — fall back to schema defaults.
  return NextResponse.json({
    settings: data ?? {
      profile_visibility: "friends",
      who_can_message: "friends",
      who_can_send_friend_request: "everyone",
      show_online_status: true,
      show_last_seen: true,
      moment_visibility: "friends",
    },
  });
}

export async function PATCH(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "وارد نشده‌ای." }, { status: 401 });

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "مقدار نامعتبر است." }, { status: 400 });
  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "چیزی برای تغییر ارسال نشده." }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, ...parsed.data, updated_at: new Date().toISOString() });
  if (error) return NextResponse.json({ error: "ذخیره‌سازی ناموفق بود." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
