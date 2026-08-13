"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function AdminDeleteButton({
  targetType,
  targetId,
  endpoint,
}: {
  targetType: string;
  targetId: string;
  endpoint: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`این ${targetType === "post" ? "پست" : "لحظه"} حذف شود؟ این عملیات در لاگ ادمین ثبت می‌شود.`)) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-danger flex-shrink-0 disabled:opacity-50"
      aria-label="حذف"
    >
      <Trash2 size={16} />
    </button>
  );
}
