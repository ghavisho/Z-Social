"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResolveReportButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function resolve() {
    setLoading(true);
    try {
      await fetch(`/api/admin/reports/${reportId}/resolve`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={resolve}
      disabled={loading}
      className="mt-2 text-xs text-y-royal font-medium disabled:opacity-50"
    >
      {loading ? "..." : "علامت‌گذاری به‌عنوان بررسی‌شده"}
    </button>
  );
}
