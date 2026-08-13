import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";

export default async function MomentDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: moment } = await supabase
    .from("moments")
    .select("id, author_id, media_type, text_content, storage_path, created_at, expires_at, profiles!moments_author_id_fkey(username, display_name)")
    .eq("id", params.id)
    .maybeSingle();

  if (!moment) return notFound();

  // Record the view (idempotent — unique constraint on moment_id+viewer_id
  // means repeat visits don't duplicate rows or over-notify).
  if (moment.author_id !== user.id) {
    const { error } = await supabase.from("moment_views").insert({ moment_id: moment.id, viewer_id: user.id });
    if (!error) {
      await supabase.from("notifications").insert({
        recipient_id: moment.author_id,
        actor_id: user.id,
        type: "moment_view",
        entity_id: moment.id,
      });
    }
  }

  // Stable proxy URL — see app/api/media/[bucket]/[...path]/route.ts.
  const mediaUrl = moment.storage_path ? `/api/media/moments/${moment.storage_path}` : null;

  let viewerCount = 0;
  let viewers: { username: string; display_name: string | null }[] = [];
  if (moment.author_id === user.id) {
    const { data: views } = await supabase
      .from("moment_views")
      .select("viewer:profiles!moment_views_viewer_id_fkey(username, display_name)")
      .eq("moment_id", moment.id);
    viewerCount = views?.length ?? 0;
    viewers = (views ?? []).map((v: any) => v.viewer).filter(Boolean);
  }

  return (
    <main dir="rtl" className="min-h-screen bg-y-deep text-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-4">
        <Link href={`/profile/${moment.profiles?.username}`} className="text-sm hover:underline">
          <p className="font-medium">{moment.profiles?.display_name ?? moment.profiles?.username}</p>
        </Link>
        <Link href="/pulse" className="text-white/80">
          <X size={22} />
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center px-6">
        {moment.media_type === "text" && (
          <p className="text-xl leading-relaxed text-center">{moment.text_content}</p>
        )}
        {moment.media_type === "image" && mediaUrl && (
          <div className="relative w-full max-w-md h-[70vh]">
            <Image src={mediaUrl} alt="" fill sizes="100vw" className="rounded-y object-contain" />
          </div>
        )}
        {moment.media_type === "video" && mediaUrl && (
          <video src={mediaUrl} controls autoPlay className="max-h-[70vh] rounded-y" />
        )}
      </div>

      {moment.author_id === user.id && (
        <footer className="px-4 py-4 text-sm text-white/80">
          <p className="mb-2">{viewerCount} بازدید</p>
          <div className="flex flex-wrap gap-2">
            {viewers.slice(0, 10).map((v, i) => (
              <span key={i} className="bg-surface-light/10 rounded-full px-3 py-1 text-xs">
                {v.display_name ?? v.username}
              </span>
            ))}
          </div>
        </footer>
      )}
    </main>
  );
}
