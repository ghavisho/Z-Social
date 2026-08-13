import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "وارد نشده‌ای." }, { status: 401 });

  const { data: existing } = await supabase
    .from("likes")
    .select("id")
    .eq("post_id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("likes").delete().eq("id", existing.id);
    return NextResponse.json({ ok: true, liked: false });
  }

  const { error } = await supabase.from("likes").insert({ post_id: params.id, user_id: user.id });
  if (error) return NextResponse.json({ error: "خطا در ثبت پسند." }, { status: 500 });

  // Notify the post author (skip self-notification).
  const { data: post } = await supabase.from("posts").select("author_id").eq("id", params.id).maybeSingle();
  if (post && post.author_id !== user.id) {
    await supabase.from("notifications").insert({
      recipient_id: post.author_id,
      actor_id: user.id,
      type: "like",
      entity_id: params.id,
    });
  }

  return NextResponse.json({ ok: true, liked: true });
}
