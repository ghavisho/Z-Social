import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeletedTag } from "@/components/admin/DeletedTag";

export default async function AdminConversationDetailPage({ params }: { params: { id: string } }) {
  const { admin: adminProfile } = await requireAdmin();
  const admin = createAdminClient();
  const isSuperAdmin = adminProfile.role === "super_admin";

  const { data: conversation } = await admin.from("conversations").select("id, is_group, title").eq("id", params.id).maybeSingle();
  if (!conversation) return notFound();

  // Spec §36: every admin access to a private conversation must be logged
  // and auditable. This write happens BEFORE any message content is read
  // or returned below — access is logged even if the admin never scrolls
  // past this point.
  await admin.from("admin_logs").insert({
    admin_id: adminProfile.id,
    action: "admin_viewed_conversation",
    target_type: "conversation",
    target_id: params.id,
  });

  let query = admin
    .from("messages")
    .select(
      "id, body, message_type, created_at, deleted_at, sender_id, profiles!messages_sender_id_fkey(username), message_media(storage_path, media_type)"
    )
    .eq("conversation_id", params.id)
    .order("created_at", { ascending: true })
    .limit(500);

  // Same rule as everywhere else: a message a user deleted is invisible to
  // everyone except the super_admin, and even then it's clearly red-tagged.
  if (!isSuperAdmin) query = query.is("deleted_at", null);

  const { data: messages } = await query;

  return (
    <main dir="rtl" className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/admin/messages" className="text-sm text-y-royal">
        &larr; بازگشت
      </Link>
      <h1 className="text-xl font-bold mt-3 mb-2">جزئیات مکالمه</h1>
      <p className="text-xs text-danger bg-danger/10 rounded-y px-3 py-2 mb-6">
        این دسترسی همین الان در admin_logs با شناسه‌ی ادمین {adminProfile.username} ثبت شد.
      </p>

      <div className="space-y-2">
        {messages?.map((m: any) => {
          const media = m.message_media?.[0];
          return (
            <div key={m.id} className="text-sm rounded-y bg-y-soft/40 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">@{m.profiles?.username}</span>
                <span className="text-ink-muted text-xs">({m.message_type})</span>
                {m.deleted_at && <DeletedTag />}
              </div>
              {m.body && <p className={`mt-1 ${m.deleted_at ? "line-through text-ink-muted" : ""}`}>{m.body}</p>}
              {media && (
                <div className="mt-2">
                  {media.media_type === "image" && (
                    <img src={`/api/admin/media/messages/${media.storage_path}`} alt="" className="max-w-[200px] rounded-y" />
                  )}
                  {media.media_type === "video" && (
                    <video src={`/api/admin/media/messages/${media.storage_path}`} controls className="max-w-[240px] rounded-y" />
                  )}
                  {media.media_type === "audio" && (
                    <audio src={`/api/admin/media/voice/${media.storage_path}`} controls className="h-8" />
                  )}
                </div>
              )}
            </div>
          );
        })}
        {(!messages || messages.length === 0) && (
          <p className="text-sm text-ink-muted text-center py-8">پیامی وجود ندارد.</p>
        )}
      </div>
    </main>
  );
}
