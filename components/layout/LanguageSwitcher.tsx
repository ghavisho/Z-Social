"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/dictionary";

export function LanguageSwitcher({ current, className = "" }: { current: Locale; className?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function switchTo(locale: Locale) {
    if (locale === current || loading) return;
    setLoading(true);
    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`inline-flex items-center rounded-full border border-y-lavender/60 p-0.5 text-xs ${className}`}>
      <button
        onClick={() => switchTo("en")}
        disabled={loading}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          current === "en" ? "bg-y-royal text-white" : "text-ink-muted"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => switchTo("fa")}
        disabled={loading}
        className={`px-2.5 py-1 rounded-full transition-colors ${
          current === "fa" ? "bg-y-royal text-white" : "text-ink-muted"
        }`}
      >
        فا
      </button>
    </div>
  );
}
