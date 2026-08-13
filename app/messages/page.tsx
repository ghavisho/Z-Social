import { createClient } from "@/lib/supabase/server";
import { ZDock } from "@/components/layout/ZDock";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

export default async function MessagesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("conversation_members")
    .select("conversation_id, last_read_at, conversations(id, title, is_group)")
    .eq("user_id", user.id);

  const conversations = await Promise.all(
    (memberships ?? []).map(async (m: any) => {
      // For a 1:1 chat, the "name" shown is the OTHER participant, not
      // conversations.title (which is only meaningful for group chats).
      let displayName = m.conversations?.title;
      if (!m.conversations?.is_group) {
        const { data: otherMember } = await supabase
          .from("conversation_members")
          .select("profiles!conversation_members_user_id_fkey(username, display_name)")
          .eq("conversation_id", m.conversation_id)
          .neq("user_id", user.id)
          .maybeSingle();
        displayName = (otherMember as any)?.profiles?.display_name ?? (otherMember as any)?.profiles?.username;
      }

      const { data: lastMessage } = await supabase
        .from("messages")
        .select("body, message_type, created_at, sender_id")
        .eq("conversation_id", m.conversation_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { count: unreadCount } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", m.conversation_id)
        .neq("sender_id", user.id)
        .gt("created_at", m.last_read_at ?? "1970-01-01");

      return {
        conversationId: m.conversation_id,
        displayName: displayName ?? "مکالمه",
        lastMessage,
        unreadCount: unreadCount ?? 0,
      };
    })
  );

  conversations.sort((a, b) => {
    const aTime = a.lastMessage?.created_at ?? "1970-01-01";
    const bTime = b.lastMessage?.created_at ?? "1970-01-01";
    return bTime.localeCompare(aTime);
  });

  return (
    <main dir="rtl" className="max-w-xl mx-auto px-4 pb-28 pt-6">
      <h1 className="text-2xl font-bold mb-6">پیام‌ها</h1>

      {conversations.length === 0 && (
        <p className="text-sm text-ink-muted text-center py-16">
          هنوز مکالمه‌ای نداری — از پروفایل یکی از دوستانت روی «پیام» بزن.
        </p>
      )}

      <div className="divide-y divide-y-soft">
        {conversations.map((c) => {
          const preview =
            c.lastMessage?.message_type === "audio"
              ? "پیام صوتی"
              : c.lastMessage?.message_type === "image"
              ? "عکس"
              : c.lastMessage?.message_type === "video"
              ? "ویدیو"
              : c.lastMessage?.body ?? "هنوز پیامی نیست";

          return (
            <Link key={c.conversationId} href={`/messages/${c.conversationId}`} className="flex items-center gap-3 py-4">
              <div className="w-11 h-11 rounded-full bg-y-lavender flex items-center justify-center text-sm font-semibold text-y-deep flex-shrink-0">
                {c.displayName[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{c.displayName}</p>
                <p className="text-xs text-ink-muted truncate">{preview}</p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {c.lastMessage?.created_at && (
                  <span className="text-[11px] text-ink-muted">{formatDistanceToNow(new Date(c.lastMessage.created_at))}</span>
                )}
                {c.unreadCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-y-royal text-white text-[10px] flex items-center justify-center">
                    {c.unreadCount > 9 ? "9+" : c.unreadCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <ZDock />
    </main>
  );
}
