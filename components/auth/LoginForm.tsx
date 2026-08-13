"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ZLogo } from "@/components/ui/ZLogo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { t, type Locale } from "@/lib/i18n/dictionary";

export function LoginForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || (locale === "fa" ? "نام کاربری یا رمز عبور اشتباه است." : "Incorrect username or password."));
        return;
      }
      router.push(data.passwordChangeRequired ? "/settings/change-password" : "/pulse");
    } catch {
      setError(locale === "fa" ? "ارتباط با سرور برقرار نشد." : "Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-y-soft/40 px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-4">
          <LanguageSwitcher current={locale} />
        </div>
        <div className="flex flex-col items-center mb-8">
          <ZLogo size={48} />
          <h1 className="mt-4 text-xl font-bold">{t(locale, "auth.loginTitle")}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-ink-muted">{t(locale, "auth.username")}</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mt-1 w-full rounded-y border border-y-lavender/60 px-4 py-3 outline-none focus:border-y-royal bg-surface-light"
            />
          </label>
          <label className="block">
            <span className="text-sm text-ink-muted">{t(locale, "auth.password")}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-y border border-y-lavender/60 px-4 py-3 outline-none focus:border-y-royal bg-surface-light"
            />
          </label>

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-y-royal text-white rounded-y py-3 font-medium hover:bg-y-deep transition-colors disabled:opacity-60"
          >
            {loading ? t(locale, "auth.loggingIn") : t(locale, "auth.login")}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted mt-6">
          {t(locale, "auth.noAccount")}{" "}
          <Link href="/register" className="text-y-royal font-medium">
            {t(locale, "auth.signup")}
          </Link>
        </p>
      </div>
    </main>
  );
}
