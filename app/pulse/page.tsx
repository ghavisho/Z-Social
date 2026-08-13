import { createClient } from "@/lib/supabase/server";
import { ZDock } from "@/components/layout/ZDock";
import { PulseFeed } from "@/components/pulse/PulseFeed";
import { MomentsRail } from "@/components/pulse/MomentsRail";
import { NotificationBell } from "@/components/layout/NotificationBell";

export default async function PulsePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: postsRaw } = await supabase
    .from("posts")
    .select(
      "id, body, created_at, author_id, profiles!posts_author_id_fkey(username, display_name, avatar_url), post_media(storage_path, media_type), likes(user_id), comments(id)"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const posts = (postsRaw ?? []).map((p: any) => ({
    ...p,
    likeCount: p.likes?.length ?? 0,
    commentCount: p.comments?.length ?? 0,
    likedByMe: !!p.likes?.some((l: any) => l.user_id === user?.id),
  }));

  const { data: moments } = await supabase
    .from("moments")
    .select("id, author_id, media_type, text_content, storage_path, profiles!moments_author_id_fkey(username, display_name, avatar_url)")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <main dir="rtl" className="max-w-xl mx-auto px-4 pb-28 pt-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold">پالس</h1>
        <NotificationBell />
      </div>
      <p className="text-sm text-ink-muted mb-6">این‌جا فقط فید نیست — دایره‌ی توست.</p>

      <MomentsRail moments={moments ?? []} />
      <PulseFeed posts={posts} currentUserId={user?.id} />

      <ZDock />
    </main>
  );
}
