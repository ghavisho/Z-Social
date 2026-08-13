"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";

export function RequestActionButtons({
  targetUserId,
  mode,
}: {
  requestId: string;
  targetUserId: string;
  mode: "incoming" | "outgoing";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function call(action: string) {
    setLoading(true);
    try {
      await fetch("/api/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetUserId }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (mode === "outgoing") {
    return (
      <button
        onClick={() => call("cancel")}
        disabled={loading}
        className="text-xs text-ink-muted hover:text-danger transition-colors"
      >
        لغو
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => call("accept")}
        disabled={loading}
        className="w-8 h-8 rounded-full bg-y-royal text-white flex items-center justify-center hover:bg-y-deep transition-colors"
        aria-label="پذیرفتن"
      >
        <Check size={15} />
      </button>
      <button
        onClick={() => call("reject")}
        disabled={loading}
        className="w-8 h-8 rounded-full border border-y-soft text-ink-muted flex items-center justify-center hover:bg-y-soft transition-colors"
        aria-label="رد کردن"
      >
        <X size={15} />
      </button>
    </div>
  );
}
