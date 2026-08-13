import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Schema = z.object({
  action: z.enum(["block", "unblock"]),
  targetUserId: z.string().uuid(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "وارد نشده‌ای." }, { status: 401 });

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ورودی نامعتبر است." }, { status: 400 });
  const { action, targetUserId } = parsed.data;

  if (action === "block") {
    const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: targetUserId });
    if (error) return NextResponse.json({ error: "خطا در مسدودسازی." }, { status: 500 });

    // Blocking also dissolves any existing friendship, in both directions.
    const [userA, userB] = [user.id, targetUserId].sort();
    await supabase.from("friendships").delete().eq("user_a", userA).eq("user_b", userB);

    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("blocks").delete().eq("blocker_id", user.id).eq("blocked_id", targetUserId);
  if (error) return NextResponse.json({ error: "خطا." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
