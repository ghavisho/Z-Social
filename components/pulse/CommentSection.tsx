"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Flag } from "lucide-react";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author_id: string;
  profiles: { username: string; display_name: string | null } | null;
};

export function CommentSection({ postId, onCommentAdded }: { postId: string; onCommentAdded: () => void }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [myProfile, setMyProfile] = useState<{ username: string; display_name: string | null } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setUserId(data.user?.id ?? null);
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, display_name")
          .eq("id", data.user.id)
          .maybeSingle();
        setMyProfile(profile);
      }
    });

    fetch(`/api/posts/${postId}/comments`)
      .then((res) => res.json())
      .then((data) => setComments(data.comments ?? []))
      .finally(() => setLoading(false));
  }, [postId]);

  async function submit() {
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((prev) => [...prev, { ...data.comment, profiles: myProfile }]);
        setDraft("");
        onCommentAdded();
      }
    } finally {
      setSending(false);
    }
  }

  async function remove(commentId: string) {
    if (!confirm("این نظر حذف شود؟")) return;
    const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
    if (res.ok) setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  async function reportComment(commentId: string) {
    const reason = prompt("چرا این نظر را گزارش می‌کنی؟");
    if (!reason || !reason.trim()) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType: "comment", targetId: commentId, reason: reason.trim() }),
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-y-soft/70 space-y-2">
      {loading && <p className="text-xs text-ink-muted">در حال بارگذاری نظرات...</p>}
      {!loading &&
        comments.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-2 text-xs">
            <div>
              <Link href={`/profile/${c.profiles?.username}`} className="font-medium hover:underline">
                {c.profiles?.display_name ?? c.profiles?.username}
              </Link>{" "}
              <span className="text-ink">{c.body}</span>{" "}
              <span className="text-ink-muted">· {formatDistanceToNow(new Date(c.created_at))}</span>
            </div>
            {c.author_id === userId ? (
              <button onClick={() => remove(c.id)} className="text-ink-muted hover:text-danger flex-shrink-0">
                <Trash2 size={12} />
              </button>
            ) : (
              <button onClick={() => reportComment(c.id)} className="text-ink-muted hover:text-danger flex-shrink-0">
                <Flag size={12} />
              </button>
            )}
          </div>
        ))}
      {!loading && comments.length === 0 && (
        <p className="text-xs text-ink-muted">هنوز نظری ثبت نشده — اولین نفر باش.</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="نظرت رو بنویس..."
          className="flex-1 rounded-full bg-y-soft/60 px-3 py-1.5 text-xs outline-none"
        />
        <button
          onClick={submit}
          disabled={!draft.trim() || sending}
          className="text-xs text-y-royal font-medium disabled:opacity-40"
        >
          ارسال
        </button>
      </div>
    </div>
  );
}
