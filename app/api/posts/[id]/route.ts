import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "وارد نشده‌ای." }, { status: 401 });

  const { data: post } = await supabase.from("posts").select("author_id").eq("id", params.id).maybeSingle();
  if (!post) return NextResponse.json({ error: "پست یافت نشد." }, { status: 404 });
  if (post.author_id !== user.id) return NextResponse.json({ error: "اجازه نداری." }, { status: 403 });

  const { error } = await supabase
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: "حذف ناموفق بود." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
