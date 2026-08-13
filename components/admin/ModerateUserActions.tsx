"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserX, UserCheck, WifiOff, Smartphone } from "lucide-react";

export function ModerateUserActions({
  userId,
  isActive,
  hasIp,
  hasDevice,
  ipAlreadyBanned,
  deviceAlreadyBanned,
}: {
  userId: string;
  isActive: boolean;
  hasIp: boolean;
  hasDevice: boolean;
  ipAlreadyBanned: boolean;
  deviceAlreadyBanned: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "deactivate" | "reactivate" | "ban_ip" | "ban_device", confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    let reason: string | undefined;
    if (action === "ban_ip" || action === "ban_device") {
      reason = prompt("دلیل بلاک‌کردن (اختیاری):") ?? undefined;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason }),
      });
      if (res.ok) router.refresh();
      else {
        const data = await res.json();
        alert(data.error || "خطا در انجام عملیات.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {isActive ? (
        <button
          onClick={() => act("deactivate", "این حساب غیرفعال شود؟ کاربر دیگر نمی‌تواند وارد شود.")}
          disabled={busy}
          className="flex items-center gap-1.5 text-xs rounded-y border border-danger/40 text-danger px-3 py-2 hover:bg-danger/10 transition-colors disabled:opacity-50"
        >
          <UserX size={14} /> غیرفعال‌کردن حساب
        </button>
      ) : (
        <button
          onClick={() => act("reactivate")}
          disabled={busy}
          className="flex items-center gap-1.5 text-xs rounded-y border border-success/40 text-success px-3 py-2 hover:bg-success/10 transition-colors disabled:opacity-50"
        >
          <UserCheck size={14} /> فعال‌کردن دوباره
        </button>
      )}

      <button
        onClick={() =>
          act(
            "ban_ip",
            "آدرس IP این کاربر برای همیشه بلاک می‌شود و حساب هم غیرفعال می‌شود. این کار قابل بازگشت نیست از طریق این دکمه. مطمئنی؟"
          )
        }
        disabled={busy || !hasIp || ipAlreadyBanned}
        className="flex items-center gap-1.5 text-xs rounded-y border border-danger/40 text-danger px-3 py-2 hover:bg-danger/10 transition-colors disabled:opacity-50"
        title={!hasIp ? "این کاربر هیچ IP ثبت‌شده‌ای ندارد" : undefined}
      >
        <WifiOff size={14} /> {ipAlreadyBanned ? "IP بلاک شده" : "بلاک‌کردن IP برای همیشه"}
      </button>

      <button
        onClick={() =>
          act(
            "ban_device",
            "این دستگاه برای همیشه بلاک می‌شود و حساب هم غیرفعال می‌شود. اگر کاربر Cache مرورگرش را پاک کند یا از دستگاه دیگری استفاده کند، این بلاک دور زده می‌شود. مطمئنی؟"
          )
        }
        disabled={busy || !hasDevice || deviceAlreadyBanned}
        className="flex items-center gap-1.5 text-xs rounded-y border border-danger/40 text-danger px-3 py-2 hover:bg-danger/10 transition-colors disabled:opacity-50"
        title={!hasDevice ? "این کاربر هیچ شناسه‌ی دستگاهی ندارد" : undefined}
      >
        <Smartphone size={14} /> {deviceAlreadyBanned ? "دستگاه بلاک شده" : "بلاک‌کردن دستگاه برای همیشه"}
      </button>
    </div>
  );
}
