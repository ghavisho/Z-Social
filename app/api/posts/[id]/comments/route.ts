import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { moderateContent } from "@/lib/ai/moderation";
import { isRateLimited } from "@/lib/utils/rateLimit";

const Schema = z.object({ body: z.string().min(1).max(1000) });

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, body, created_at, author_id, profiles!comments_author_id_fkey(username, display_name)")
    .eq("post_id", params.id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) return NextResponse.json({ error: "خطا در بارگذاری نظرات." }, { status: 500 });
  return NextResponse.json({ comments: data });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "وارد نشده‌ای." }, { status: 401 });

  if (isRateLimited(`comments:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "کمی آهسته‌تر — چند لحظه صبر کن." }, { status: 429 });
  }

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "نظر معتبر نیست." }, { status: 400 });

  const moderation = await moderateContent(parsed.data.body);
  if (!moderation.allowed) {
    return NextResponse.json({ error: "این نظر شبیه اسپم است." }, { status: 422 });
  }

  const { data: inserted, error } = await supabase
    .from("comments")
    .insert({ post_id: params.id, author_id: user.id, body: parsed.data.body })
    .select("id, body, created_at, author_id")
    .single();
  if (error) return NextResponse.json({ error: "امکان ثبت نظر نبود." }, { status: 500 });

  const { data: post } = await supabase.from("posts").select("author_id").eq("id", params.id).maybeSingle();
  if (post && post.author_id !== user.id) {
    await supabase.from("notifications").insert({
      recipient_id: post.author_id,
      actor_id: user.id,
      type: "comment",
      entity_id: params.id,
    });
  }

  return NextResponse.json({ ok: true, comment: inserted });
}
