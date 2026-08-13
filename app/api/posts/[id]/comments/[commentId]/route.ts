import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: { id: string; commentId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "وارد نشده‌ای." }, { status: 401 });

  const { data: comment } = await supabase
    .from("comments")
    .select("author_id")
    .eq("id", params.commentId)
    .maybeSingle();
  if (!comment) return NextResponse.json({ error: "نظر یافت نشد." }, { status: 404 });
  if (comment.author_id !== user.id) return NextResponse.json({ error: "اجازه نداری." }, { status: 403 });

  const { error } = await supabase
    .from("comments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.commentId);
  if (error) return NextResponse.json({ error: "حذف ناموفق بود." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
