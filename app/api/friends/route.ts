import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/utils/rateLimit";

const Schema = z.object({
  action: z.enum(["request", "accept", "reject", "cancel", "remove"]),
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

  if (targetUserId === user.id) {
    return NextResponse.json({ error: "این عملیات روی خودت معتبر نیست." }, { status: 400 });
  }

  if (action === "request") {
    if (isRateLimited(`friend-requests:${user.id}`, 15, 60_000)) {
      return NextResponse.json({ error: "درخواست‌های زیاد — کمی صبر کن." }, { status: 429 });
    }

    const { data: blocked } = await supabase
      .from("blocks")
      .select("id")
      .or(`and(blocker_id.eq.${targetUserId},blocked_id.eq.${user.id}),and(blocker_id.eq.${user.id},blocked_id.eq.${targetUserId})`)
      .maybeSingle();
    if (blocked) return NextResponse.json({ error: "امکان ارسال درخواست وجود ندارد." }, { status: 403 });

    // Respect the receiver's privacy setting for who can send friend requests.
    const { data: settings } = await supabase
      .from("user_settings")
      .select("who_can_send_friend_request")
      .eq("user_id", targetUserId)
      .maybeSingle();
    if (settings?.who_can_send_friend_request === "nobody") {
      return NextResponse.json({ error: "این کاربر درخواست دوستی دریافت نمی‌کند." }, { status: 403 });
    }

    const { error } = await supabase
      .from("friend_requests")
      .insert({ sender_id: user.id, receiver_id: targetUserId, status: "pending" });
    if (error) return NextResponse.json({ error: "امکان ارسال درخواست نبود (شاید قبلاً ارسال شده)." }, { status: 409 });

    await supabase.from("notifications").insert({
      recipient_id: targetUserId,
      actor_id: user.id,
      type: "friend_request",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "cancel" || action === "reject") {
    const filterCol = action === "cancel" ? "sender_id" : "receiver_id";
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: action === "cancel" ? "cancelled" : "rejected", responded_at: new Date().toISOString() })
      .eq(filterCol, user.id)
      .eq(filterCol === "sender_id" ? "receiver_id" : "sender_id", targetUserId)
      .eq("status", "pending");
    if (error) return NextResponse.json({ error: "خطا." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "accept") {
    const { data: req, error: findError } = await supabase
      .from("friend_requests")
      .select("id")
      .eq("sender_id", targetUserId)
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .maybeSingle();
    if (findError || !req) return NextResponse.json({ error: "درخواستی یافت نشد." }, { status: 404 });

    const { error: updateError } = await supabase
      .from("friend_requests")
      .update({ status: "accepted", responded_at: new Date().toISOString() })
      .eq("id", req.id);
    if (updateError) return NextResponse.json({ error: "خطا." }, { status: 500 });

    const [userA, userB] = [user.id, targetUserId].sort();
    const { error: friendshipError } = await supabase
      .from("friendships")
      .insert({ user_a: userA, user_b: userB });
    if (friendshipError) return NextResponse.json({ error: "خطا در ساخت دوستی." }, { status: 500 });

    await supabase.from("notifications").insert({
      recipient_id: targetUserId,
      actor_id: user.id,
      type: "friend_accepted",
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "remove") {
    const [userA, userB] = [user.id, targetUserId].sort();
    const { error } = await supabase.from("friendships").delete().eq("user_a", userA).eq("user_b", userB);
    if (error) return NextResponse.json({ error: "خطا." }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // Blocking/unblocking is handled by /api/blocks (keeps this route focused
  // on friend-request state machine only).

  return NextResponse.json({ error: "عملیات نامعتبر." }, { status: 400 });
}
