"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, Clock, MoreHorizontal, Ban, Flag } from "lucide-react";

type FriendState = "none" | "pending_sent" | "pending_received" | "friends";

export function FriendActionButton({
  targetUserId,
  initialState,
}: {
  targetUserId: string;
  initialState: FriendState;
}) {
  const router = useRouter();
  const [state, setState] = useState<FriendState>(initialState);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function call(action: string) {
    setLoading(true);
    try {
      await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetUserId }),
      });
    } finally {
      setLoading(false);
    }
  }

  async function sendRequest() {
    await call("request");
    setState("pending_sent");
  }
  async function cancelRequest() {
    await call("cancel");
    setState("none");
  }
  async function acceptRequest() {
    await call("accept");
    setState("friends");
  }
  async function removeFriend() {
    await call("remove");
    setState("none");
  }
  async function blockUser() {
    await fetch("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "block", targetUserId }),
    });
    router.push("/discover");
  }

  return (
    <div className="flex items-center gap-2">
      {state === "none" && (
        <button
          onClick={sendRequest}
          disabled={loading}
          className="flex items-center gap-1.5 bg-y-royal text-white rounded-y px-4 py-2 text-sm font-medium hover:bg-y-deep transition-colors disabled:opacity-60"
        >
          <UserPlus size={16} /> افزودن به دایره
        </button>
      )}
      {state === "pending_sent" && (
        <button
          onClick={cancelRequest}
          disabled={loading}
          className="flex items-center gap-1.5 border border-y-lavender text-y-deep rounded-y px-4 py-2 text-sm font-medium hover:bg-y-soft transition-colors"
        >
          <Clock size={16} /> در انتظار — لغو کن
        </button>
      )}
      {state === "pending_received" && (
        <button
          onClick={acceptRequest}
          disabled={loading}
          className="flex items-center gap-1.5 bg-y-royal text-white rounded-y px-4 py-2 text-sm font-medium hover:bg-y-deep transition-colors"
        >
          <UserCheck size={16} /> پذیرفتن درخواست
        </button>
      )}
      {state === "friends" && (
        <button
          onClick={removeFriend}
          disabled={loading}
          className="flex items-center gap-1.5 border border-y-lavender text-y-deep rounded-y px-4 py-2 text-sm font-medium hover:bg-y-soft transition-colors"
        >
          <UserCheck size={16} /> در دایره‌ی توست
        </button>
      )}

      <div className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-y-soft text-ink-muted hover:bg-y-soft transition-colors"
          aria-label="گزینه‌های بیشتر"
        >
          <MoreHorizontal size={18} />
        </button>
        {menuOpen && (
          <div className="absolute left-0 mt-2 w-40 rounded-y border border-y-soft bg-surface-light shadow-y py-1 text-sm z-10">
            <button
              onClick={blockUser}
              className="w-full flex items-center gap-2 px-3 py-2 text-danger hover:bg-y-soft/50"
            >
              <Ban size={15} /> مسدود کردن
            </button>
            <button
              onClick={() =>
                fetch("/api/reports", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ targetType: "user", targetId: targetUserId, reason: "گزارش از پروفایل" }),
                })
              }
              className="w-full flex items-center gap-2 px-3 py-2 text-ink-muted hover:bg-y-soft/50"
            >
              <Flag size={15} /> گزارش کاربر
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
