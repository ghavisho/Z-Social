"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { t, type Locale } from "@/lib/i18n/dictionary";
import { ACCENT_PRESETS, type AccentPreset } from "@/lib/theme/preferences";

const ACCENT_SWATCHES: Record<AccentPreset, string> = {
  purple: "#6E3AD1",
  blue: "#2563EB",
  green: "#16A34A",
  rose: "#E11D48",
  amber: "#D97706",
  teal: "#0D9488",
};

const ACCENT_LABELS: Record<Locale, Record<AccentPreset, string>> = {
  en: { purple: "Purple", blue: "Blue", green: "Green", rose: "Rose", amber: "Amber", teal: "Teal" },
  fa: { purple: "بنفش", blue: "آبی", green: "سبز", rose: "رز", amber: "کهربایی", teal: "فیروزه‌ای" },
};

export function AppearanceSettings({
  locale,
  theme,
  accent,
}: {
  locale: Locale;
  theme: "light" | "dark";
  accent: AccentPreset;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setPreference(body: Record<string, string>) {
    setBusy(true);
    try {
      await fetch("/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-y bg-y-soft/50 px-4 py-3">
        <span className="text-sm">{locale === "fa" ? "زبان" : "Language"}</span>
        <LanguageSwitcher current={locale} />
      </div>

      <div className="flex items-center justify-between rounded-y bg-y-soft/50 px-4 py-3">
        <span className="text-sm">{locale === "fa" ? "حالت نمایش" : "Appearance"}</span>
        <div className="inline-flex items-center rounded-full border border-y-lavender/60 p-0.5">
          <button
            disabled={busy}
            onClick={() => setPreference({ theme: "light" })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${
              theme === "light" ? "bg-y-royal text-white" : "text-ink-muted"
            }`}
          >
            <Sun size={13} /> {locale === "fa" ? "روشن" : "Light"}
          </button>
          <button
            disabled={busy}
            onClick={() => setPreference({ theme: "dark" })}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors ${
              theme === "dark" ? "bg-y-royal text-white" : "text-ink-muted"
            }`}
          >
            <Moon size={13} /> {locale === "fa" ? "تاریک" : "Dark"}
          </button>
        </div>
      </div>

      <div className="rounded-y bg-y-soft/50 px-4 py-3">
        <p className="text-sm mb-3">{locale === "fa" ? "رنگ اصلی" : "Accent color"}</p>
        <div className="flex flex-wrap gap-3">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset}
              disabled={busy}
              onClick={() => setPreference({ accent: preset })}
              aria-label={ACCENT_LABELS[locale][preset]}
              title={ACCENT_LABELS[locale][preset]}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105"
              style={{
                backgroundColor: ACCENT_SWATCHES[preset],
                outline: accent === preset ? "2px solid currentColor" : "none",
                outlineOffset: 2,
              }}
            >
              {accent === preset && <span className="w-2 h-2 rounded-full bg-white" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
