"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2, Flag } from "lucide-react";

export function PostMenu({
  postId,
  isOwn,
  onDeleted,
}: {
  postId: string;
  isOwn: boolean;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState(false);

  async function handleDelete() {
    if (!confirm("این پست حذف شود؟")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) onDeleted();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  async function handleReport() {
    const reason = prompt("چرا این پست را گزارش می‌کنی؟");
    if (!reason || !reason.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "post", targetId: postId, reason: reason.trim() }),
      });
      if (res.ok) setReported(true);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="text-ink-muted hover:text-ink p-1" aria-label="گزینه‌ها">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute left-0 top-6 z-10 w-40 rounded-y border border-y-soft bg-surface-light shadow-y py-1 text-sm">
          {isOwn ? (
            <button
              onClick={handleDelete}
              disabled={busy}
              className="w-full flex items-center gap-2 px-3 py-2 text-danger hover:bg-y-soft/50 transition-colors"
            >
              <Trash2 size={14} /> حذف پست
            </button>
          ) : reported ? (
            <p className="px-3 py-2 text-xs text-ink-muted">گزارش شد</p>
          ) : (
            <button
              onClick={handleReport}
              disabled={busy}
              className="w-full flex items-center gap-2 px-3 py-2 text-ink hover:bg-y-soft/50 transition-colors"
            >
              <Flag size={14} /> گزارش پست
            </button>
          )}
        </div>
      )}
    </div>
  );
}
