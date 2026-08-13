"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ZLogo } from "@/components/ui/ZLogo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { t, type Locale } from "@/lib/i18n/dictionary";

const ERRORS = {
  en: {
    usernameInvalid: "Username must be 3–24 characters, letters/numbers/underscore only.",
    passwordShort: "Password must be at least 8 characters.",
    generic: "Something went wrong. Try again.",
    network: "Could not reach the server.",
  },
  fa: {
    usernameInvalid: "نام کاربری باید ۳ تا ۲۴ کاراکتر و فقط شامل حروف انگلیسی، عدد و _ باشد.",
    passwordShort: "رمز عبور باید حداقل ۸ کاراکتر باشد.",
    generic: "خطایی رخ داد. دوباره تلاش کن.",
    network: "ارتباط با سرور برقرار نشد.",
  },
};

export function RegisterForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const strings = ERRORS[locale];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (username.length < 3 || username.length > 24 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      setError(strings.usernameInvalid);
      return;
    }
    if (password.length < 8) {
      setError(strings.passwordShort);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || strings.generic);
        return;
      }
      router.push("/onboarding");
    } catch {
      setError(strings.network);
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
          <h1 className="mt-4 text-xl font-bold">{t(locale, "auth.signupTitle")}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t(locale, "auth.username")} value={username} onChange={setUsername} placeholder={t(locale, "auth.usernamePlaceholder")} />
          <Field
            label={t(locale, "auth.password")}
            value={password}
            onChange={setPassword}
            type="password"
            placeholder={t(locale, "auth.passwordPlaceholderMin")}
          />

          {error && <p className="text-danger text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-y-royal text-white rounded-y py-3 font-medium hover:bg-y-deep transition-colors disabled:opacity-60"
          >
            {loading ? t(locale, "auth.creatingAccount") : t(locale, "auth.createAccount")}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted mt-6">
          {t(locale, "auth.haveAccount")}{" "}
          <Link href="/login" className="text-y-royal font-medium">
            {t(locale, "auth.login")}
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-ink-muted">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="mt-1 w-full rounded-y border border-y-lavender/60 px-4 py-3 outline-none focus:border-y-royal transition-colors bg-surface-light"
      />
    </label>
  );
}
