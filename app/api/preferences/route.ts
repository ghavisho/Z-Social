import { NextResponse } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { PREFERENCE_COOKIE_NAMES, ACCENT_PRESETS } from "@/lib/theme/preferences";

const Schema = z.object({
  locale: z.enum(["en", "fa"]).optional(),
  theme: z.enum(["light", "dark"]).optional(),
  accent: z.enum(ACCENT_PRESETS).optional(),
});

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(request: Request) {
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid preferences" }, { status: 400 });

  const store = cookies();
  const { locale, theme, accent } = parsed.data;

  if (locale) store.set(PREFERENCE_COOKIE_NAMES.locale, locale, { maxAge: ONE_YEAR, path: "/" });
  if (theme) store.set(PREFERENCE_COOKIE_NAMES.theme, theme, { maxAge: ONE_YEAR, path: "/" });
  if (accent) store.set(PREFERENCE_COOKIE_NAMES.accent, accent, { maxAge: ONE_YEAR, path: "/" });

  return NextResponse.json({ ok: true });
}
