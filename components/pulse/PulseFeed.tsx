"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageSquare } from "lucide-react";
import { PostMedia } from "@/components/pulse/PostMedia";
import { CommentSection } from "@/components/pulse/CommentSection";
import { PostMenu } from "@/components/pulse/PostMenu";

type Post = {
  id: string;
  body: string | null;
  created_at: string;
  author_id: string;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
  post_media: { storage_path: string; media_type: string }[];
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export function PulseFeed({ posts, currentUserId }: { posts: Post[]; currentUserId?: string }) {
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const visible = posts.filter((p) => !removed.has(p.id));

  if (visible.length === 0) {
    return (
      <div className="text-center text-sm text-ink-muted py-16">
        هنوز چیزی در دایره‌ی تو نیست. اولین لحظه را به اشتراک بگذار.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {visible.map((post, i) => (
        <PostCard
          key={post.id}
          post={post}
          floating={i % 3 === 1}
          isOwn={post.author_id === currentUserId}
          onDeleted={() => setRemoved((prev) => new Set(prev).add(post.id))}
        />
      ))}
    </div>
  );
}

function PostCard({
  post,
  floating,
  isOwn,
  onDeleted,
}: {
  post: Post;
  floating: boolean;
  isOwn: boolean;
  onDeleted: () => void;
}) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [pending, setPending] = useState(false);

  async function toggleLike() {
    if (pending) return;
    setPending(true);
    // Optimistic update — feels instant, corrected if the request fails.
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikeCount((c) => c + (nextLiked ? 1 : -1));
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setLiked(data.liked);
    } catch {
      setLiked(!nextLiked);
      setLikeCount((c) => c + (nextLiked ? -1 : 1));
    } finally {
      setPending(false);
    }
  }

  return (
    <article className={floating ? "rounded-y bg-y-soft/50 p-4" : "rounded-y bg-surface-light border border-y-soft shadow-y p-4"}>
      <header className="flex items-center gap-2 mb-2">
        <Link href={`/profile/${post.profiles?.username}`} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative w-8 h-8 rounded-full bg-y-lavender flex items-center justify-center text-xs font-semibold text-y-deep overflow-hidden flex-shrink-0">
            {post.profiles?.avatar_url ? (
              <Image src={post.profiles.avatar_url} alt="" fill sizes="32px" className="object-cover" />
            ) : (
              (post.profiles?.display_name ?? post.profiles?.username ?? "?")[0]?.toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{post.profiles?.display_name ?? post.profiles?.username}</p>
            <p className="text-[11px] text-ink-muted">{formatDistanceToNow(new Date(post.created_at))}</p>
          </div>
        </Link>
        <PostMenu postId={post.id} isOwn={isOwn} onDeleted={onDeleted} />
      </header>

      {post.body && <p className="text-sm leading-6 mb-2">{post.body}</p>}

      {post.post_media?.[0] && (
        <div className="rounded-y overflow-hidden mb-2 bg-charcoal/5">
          <PostMedia storagePath={post.post_media[0].storage_path} mediaType={post.post_media[0].media_type} />
        </div>
      )}

      <footer className="flex items-center gap-4 text-ink-muted text-xs pt-1">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1 transition-colors ${liked ? "text-danger" : "hover:text-y-royal"}`}
        >
          <Heart size={16} fill={liked ? "currentColor" : "none"} /> {likeCount > 0 ? likeCount : "پسندیدن"}
        </button>
        <button
          onClick={() => setCommentsOpen((v) => !v)}
          className="flex items-center gap-1 hover:text-y-royal transition-colors"
        >
          <MessageSquare size={16} /> {commentCount > 0 ? commentCount : "نظر"}
        </button>
      </footer>

      {commentsOpen && (
        <CommentSection postId={post.id} onCommentAdded={() => setCommentCount((c) => c + 1)} />
      )}
    </article>
  );
}
