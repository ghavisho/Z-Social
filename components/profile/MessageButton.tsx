"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

export function MessageButton({ targetUserId }: { targetUserId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function startConversation() {
    setLoading(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const data = await res.json();
      if (res.ok && data.conversationId) {
        router.push(`/messages/${data.conversationId}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={startConversation}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm rounded-y border border-y-lavender px-4 py-2 text-y-deep hover:bg-y-soft transition-colors disabled:opacity-50"
    >
      <MessageCircle size={16} /> پیام
    </button>
  );
}
