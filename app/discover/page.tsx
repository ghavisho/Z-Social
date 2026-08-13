import { createClient } from "@/lib/supabase/server";
import { ZDock } from "@/components/layout/ZDock";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FriendActionButton } from "@/components/profile/FriendActionButton";
import { rerankSuggestions } from "@/lib/ai/moderation";

export default async function DiscoverPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Everyone I already have a relationship or open request with —
  // excluded from every section below so suggestions stay genuinely new.
  const [{ data: friendships }, { data: outgoing }, { data: incoming }, { data: blocked }] = await Promise.all([
    supabase.from("friendships").select("user_a, user_b").or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
    supabase.from("friend_requests").select("receiver_id").eq("sender_id", user.id).eq("status", "pending"),
    supabase.from("friend_requests").select("sender_id").eq("receiver_id", user.id).eq("status", "pending"),
    supabase.from("blocks").select("blocked_id, blocker_id").or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
  ]);

  const excluded = new Set<string>([user.id]);
  friendships?.forEach((f) => excluded.add(f.user_a === user.id ? f.user_b : f.user_a));
  outgoing?.forEach((r) => excluded.add(r.receiver_id));
  incoming?.forEach((r) => excluded.add(r.sender_id));
  blocked?.forEach((b) => excluded.add(b.blocker_id === user.id ? b.blocked_id : b.blocker_id));

  const friendIds = (friendships ?? []).map((f) => (f.user_a === user.id ? f.user_b : f.user_a));

  // "Friends of friends" — the closest thing to a real recommendation
  // without an AI provider configured (see lib/ai/moderation.ts rerankSuggestions,
  // which would re-rank this same list if AI_PROVIDER_API_KEY were set).
  let peopleYouMayKnow: any[] = [];
  if (friendIds.length > 0) {
    const { data: fof } = await supabase
      .from("friendships")
      .select("user_a, user_b")
      .or(friendIds.map((id) => `user_a.eq.${id},user_b.eq.${id}`).join(","));
    const candidateIds = new Set<string>();
    fof?.forEach((f) => {
      [f.user_a, f.user_b].forEach((id) => {
        if (!excluded.has(id)) candidateIds.add(id);
      });
    });
    if (candidateIds.size > 0) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio")
        .in("id", Array.from(candidateIds).slice(0, 10));

      const { data: viewerProfile } = await supabase.from("profiles").select("bio").eq("id", user.id).maybeSingle();
      // No-op when AI_PROVIDER_API_KEY isn't set — see lib/ai/moderation.ts.
      peopleYouMayKnow = await rerankSuggestions(data ?? [], { viewerBio: viewerProfile?.bio });
    }
  }

  const { data: newestUsers } = await supabase
    .from("profiles")
    .select("id, username, display_name, created_at")
    .not("id", "in", `(${Array.from(excluded).join(",") || user.id})`)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <main dir="rtl" className="max-w-xl mx-auto px-4 pb-28 pt-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">کشف</h1>
        <Link href="/profile/requests" className="text-xs text-y-royal font-medium">
          درخواست‌های دوستی
        </Link>
      </div>
      <p className="text-sm text-ink-muted mb-6">آدم‌های جدید، بدون اسکرول بی‌پایان.</p>

      {peopleYouMayKnow.length > 0 && (
        <PeopleSection title="افراد پیشنهادی (دوستانِ دوستان)" people={peopleYouMayKnow} />
      )}
      <PeopleSection title="تازه به Z پیوسته‌اند" people={newestUsers ?? []} />

      <ZDock />
    </main>
  );
}

function PeopleSection({ title, people }: { title: string; people: any[] }) {
  if (people.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-y-deep mb-3">{title}</h2>
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
        {people.map((p) => (
          <div key={p.id} className="flex-shrink-0 w-36 rounded-y border border-y-soft bg-surface-light p-3 text-center shadow-y">
            <Link href={`/profile/${p.username}`}>
              <div className="w-12 h-12 rounded-full bg-y-lavender mx-auto mb-2 flex items-center justify-center text-y-deep font-semibold">
                {(p.display_name ?? p.username)[0]?.toUpperCase()}
              </div>
              <p className="text-xs font-medium truncate">{p.display_name ?? p.username}</p>
            </Link>
            <div className="mt-2 flex justify-center">
              <FriendActionButton targetUserId={p.id} initialState="none" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
