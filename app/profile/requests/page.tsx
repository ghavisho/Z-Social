import { createClient } from "@/lib/supabase/server";
import { ZDock } from "@/components/layout/ZDock";
import { redirect } from "next/navigation";
import { RequestActionButtons } from "@/components/profile/RequestActionButtons";

export default async function FriendRequestsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: incoming } = await supabase
    .from("friend_requests")
    .select("id, created_at, sender:profiles!friend_requests_sender_id_fkey(id, username, display_name)")
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const { data: outgoing } = await supabase
    .from("friend_requests")
    .select("id, created_at, receiver:profiles!friend_requests_receiver_id_fkey(id, username, display_name)")
    .eq("sender_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <main dir="rtl" className="max-w-xl mx-auto px-4 pb-28 pt-6">
      <h1 className="text-2xl font-bold mb-6">درخواست‌های دوستی</h1>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-y-deep mb-3">دریافت‌شده</h2>
        <div className="space-y-2">
          {incoming?.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between rounded-y bg-y-soft/50 px-4 py-3">
              <span className="text-sm">{r.sender?.display_name ?? r.sender?.username}</span>
              <RequestActionButtons requestId={r.id} targetUserId={r.sender?.id} mode="incoming" />
            </div>
          ))}
          {(!incoming || incoming.length === 0) && (
            <p className="text-sm text-ink-muted">درخواستی دریافت نشده.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-y-deep mb-3">ارسال‌شده</h2>
        <div className="space-y-2">
          {outgoing?.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between rounded-y bg-y-soft/50 px-4 py-3">
              <span className="text-sm">{r.receiver?.display_name ?? r.receiver?.username}</span>
              <RequestActionButtons requestId={r.id} targetUserId={r.receiver?.id} mode="outgoing" />
            </div>
          ))}
          {(!outgoing || outgoing.length === 0) && (
            <p className="text-sm text-ink-muted">درخواستی ارسال نشده.</p>
          )}
        </div>
      </section>

      <ZDock />
    </main>
  );
}
