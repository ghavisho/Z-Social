import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { moderateContent } from "@/lib/ai/moderation";
import { isRateLimited } from "@/lib/utils/rateLimit";

const Schema = z.object({
  body: z.string().min(1).max(2000),
  mode: z.enum(["text", "photo", "video", "file", "moment"]),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "وارد نشده‌ای." }, { status: 401 });

  if (isRateLimited(`posts:${user.id}`, 10, 60_000)) {
    return NextResponse.json({ error: "کمی آهسته‌تر — چند لحظه صبر کن." }, { status: 429 });
  }

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ورودی نامعتبر است." }, { status: 400 });
  const { body, mode } = parsed.data;

  const moderation = await moderateContent(body);
  if (!moderation.allowed) {
    return NextResponse.json({ error: "این محتوا شبیه اسپم است و منتشر نشد." }, { status: 422 });
  }

  if (mode === "moment") {
    const { data: inserted, error } = await supabase
      .from("moments")
      .insert({
        author_id: user.id,
        media_type: "text",
        text_content: body,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: "امکان انتشار لحظه نبود." }, { status: 500 });
    return NextResponse.json({ ok: true, type: "moment", momentId: inserted.id });
  }

  const { data: inserted, error } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      body,
      visibility: "friends",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "امکان انتشار پست نبود." }, { status: 500 });
  return NextResponse.json({ ok: true, type: "post", postId: inserted.id });
}
