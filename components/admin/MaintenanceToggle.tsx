"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Power, AlertTriangle } from "lucide-react";

export function MaintenanceToggle({
  initialEnabled,
  initialMessage,
}: {
  initialEnabled: boolean;
  initialMessage: string | null;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState(initialMessage ?? "");
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !enabled;
    if (next) {
      const confirmed = confirm(
        "با فعال‌کردن حالت آفلاین، هیچ‌کس (حتی خودت با حساب عادی) نمی‌تواند وارد شود یا در Z فعالیت کند — فقط مدیر اصلی می‌تواند دوباره غیرفعالش کند. مطمئنی؟"
      );
      if (!confirmed) return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maintenanceMode: next, message }),
      });
      if (res.ok) {
        setEnabled(next);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`rounded-y border p-4 ${enabled ? "border-danger bg-danger/5" : "border-y-soft"}`}>
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={16} className={enabled ? "text-danger" : "text-warning"} />
        <p className="text-sm font-semibold">حالت آفلاین کامل شبکه</p>
      </div>
      <p className="text-xs text-ink-muted mb-3">
        وقتی فعاله، هیچ کاربر عادی‌ای (نه فقط بازدیدکننده — حتی کسی که حساب داره) نمی‌تونه وارد بشه یا کاری
        انجام بده. فقط مدیرها (admin/super_admin) دسترسی دارن.
      </p>

      {enabled && (
        <p className="text-xs text-danger font-medium mb-3">🔴 هم‌اکنون فعال است — شبکه برای همه غیر از ادمین‌ها آفلاین است.</p>
      )}

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="پیامی که کاربران هنگام آفلاین‌بودن می‌بینند (اختیاری)"
        rows={2}
        className="w-full rounded-y border border-y-soft px-3 py-2 text-sm outline-none focus:border-y-royal mb-3 bg-surface-light"
      />

      <button
        onClick={toggle}
        disabled={loading}
        className={`flex items-center gap-2 rounded-y px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
          enabled ? "bg-danger text-white hover:opacity-90" : "bg-y-royal text-white hover:bg-y-deep"
        }`}
      >
        <Power size={15} />
        {loading ? "..." : enabled ? "غیرفعال‌کردن حالت آفلاین" : "فعال‌کردن حالت آفلاین"}
      </button>
    </div>
  );
}
