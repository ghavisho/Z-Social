import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const Schema = z.object({ targetUserId: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "وارد نشده‌ای." }, { status: 401 });

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "ورودی نامعتبر است." }, { status: 400 });
  const { targetUserId } = parsed.data;

  if (targetUserId === user.id) {
    return NextResponse.json({ error: "امکان‌پذیر نیست." }, { status: 400 });
  }

  // Only friends can start a conversation (spec §14 messages sit inside
  // the friend/circle model, not open DMs to strangers).
  const [a, b] = [user.id, targetUserId].sort();
  const { data: friendship } = await supabase
    .from("friendships")
    .select("id")
    .eq("user_a", a)
    .eq("user_b", b)
    .maybeSingle();
  if (!friendship) {
    return NextResponse.json({ error: "فقط با دوستانت می‌توانی گفتگو شروع کنی." }, { status: 403 });
  }

  // Look for an existing 1:1 conversation between these two users.
  const { data: myConvos } = await supabase
    .from("conversation_members")
    .select("conversation_id, conversations!inner(is_group)")
    .eq("user_id", user.id)
    .eq("conversations.is_group", false);

  if (myConvos && myConvos.length > 0) {
    const { data: sharedConvo } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", targetUserId)
      .in("conversation_id", myConvos.map((c) => c.conversation_id))
      .maybeSingle();

    if (sharedConvo) {
      return NextResponse.json({ ok: true, conversationId: sharedConvo.conversation_id });
    }
  }

  // No existing conversation — create one. Conversations intentionally have
  // no client-facing INSERT policy (creation must go through this friendship
  // check), so this uses the admin client — the friendship check above is
  // what actually gates who can reach this line.
  const admin = createAdminClient();
  const { data: conversation, error: convoError } = await admin
    .from("conversations")
    .insert({ is_group: false })
    .select("id")
    .single();
  if (convoError || !conversation) {
    return NextResponse.json({ error: "امکان ساخت گفتگو نبود." }, { status: 500 });
  }

  const { error: memberError } = await admin.from("conversation_members").insert([
    { conversation_id: conversation.id, user_id: user.id },
    { conversation_id: conversation.id, user_id: targetUserId },
  ]);
  if (memberError) {
    return NextResponse.json({ error: "امکان افزودن اعضا نبود." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, conversationId: conversation.id });
}
