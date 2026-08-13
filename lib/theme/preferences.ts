import { cookies } from "next/headers";
import type { Locale } from "@/lib/i18n/dictionary";

export const ACCENT_PRESETS = ["purple", "blue", "green", "rose", "amber", "teal"] as const;
export type AccentPreset = (typeof ACCENT_PRESETS)[number];

export type Preferences = {
  locale: Locale;
  theme: "light" | "dark";
  accent: AccentPreset;
};

const COOKIE_LOCALE = "z_lang";
const COOKIE_THEME = "z_theme";
const COOKIE_ACCENT = "z_accent";

/**
 * Reads UI preferences from cookies (not the database) so they apply
 * instantly on every page — including the landing/login screen, before
 * anyone has an account — with zero flash-of-wrong-theme, since the root
 * layout is a Server Component that reads these before the first paint.
 *
 * Default: English, light mode, purple accent — matches "starts in English,
 * switch to Persian at login" from the spec.
 */
export function getPreferences(): Preferences {
  const store = cookies();
  const locale = (store.get(COOKIE_LOCALE)?.value as Locale) || "en";
  const theme = (store.get(COOKIE_THEME)?.value as "light" | "dark") || "light";
  const accentRaw = store.get(COOKIE_ACCENT)?.value;
  const accent = (ACCENT_PRESETS as readonly string[]).includes(accentRaw ?? "")
    ? (accentRaw as AccentPreset)
    : "purple";

  return { locale: locale === "fa" ? "fa" : "en", theme: theme === "dark" ? "dark" : "light", accent };
}

export const PREFERENCE_COOKIE_NAMES = {
  locale: COOKIE_LOCALE,
  theme: COOKIE_THEME,
  accent: COOKIE_ACCENT,
};
