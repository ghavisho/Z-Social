"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) {
      setError("رمز جدید باید حداقل ۸ کاراکتر باشد.");
      return;
    }
    if (newPassword !== confirm) {
      setError("تکرار رمز عبور مطابقت ندارد.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "خطایی رخ داد.");
        return;
      }
      router.push("/pulse");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen flex items-center justify-center bg-y-soft/40 px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold mb-2">تغییر رمز عبور</h1>
        <p className="text-sm text-ink-muted mb-6">
          برای امنیت حساب، لازم است رمز عبور اولیه را تغییر دهی.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="رمز عبور جدید"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full rounded-y border border-y-lavender/60 px-4 py-3 outline-none focus:border-y-royal bg-surface-light"
          />
          <input
            type="password"
            placeholder="تکرار رمز عبور جدید"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="w-full rounded-y border border-y-lavender/60 px-4 py-3 outline-none focus:border-y-royal bg-surface-light"
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-y-royal text-white rounded-y py-3 font-medium hover:bg-y-deep transition-colors disabled:opacity-60"
          >
            {loading ? "در حال ذخیره..." : "ذخیره رمز جدید"}
          </button>
        </form>
      </div>
    </main>
  );
}
