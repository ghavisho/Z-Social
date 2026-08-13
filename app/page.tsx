import Link from "next/link";
import { ZLogo } from "@/components/ui/ZLogo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { getPreferences } from "@/lib/theme/preferences";
import { t } from "@/lib/i18n/dictionary";

export default function LandingPage() {
  const { locale } = getPreferences();

  return (
    <main className="min-h-screen bg-gradient-to-b from-y-soft via-surface-light to-surface-light dark:from-surface-dark-muted dark:via-surface-dark dark:to-surface-dark flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <ZLogo size={32} />
          <span className="font-semibold text-lg tracking-tight">Z</span>
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <LanguageSwitcher current={locale} />
          <Link href="/login" className="text-ink-muted hover:text-ink transition-colors">
            {t(locale, "landing.login")}
          </Link>
          <Link
            href="/register"
            className="bg-y-royal text-white rounded-y px-4 py-2 hover:bg-y-deep transition-colors"
          >
            {t(locale, "landing.signup")}
          </Link>
        </nav>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
        <ZLogo size={72} />
        <h1 className="mt-6 text-4xl md:text-5xl font-bold tracking-tight text-ink">
          {t(locale, "brand.tagline")}
        </h1>
        <p className="mt-4 max-w-md text-ink-muted text-base md:text-lg">
          {t(locale, "landing.description")}
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/register"
            className="bg-y-royal text-white rounded-y px-6 py-3 font-medium hover:bg-y-deep transition-colors shadow-y"
          >
            {t(locale, "landing.getStarted")}
          </Link>
          <Link
            href="/login"
            className="border border-y-lavender text-y-deep rounded-y px-6 py-3 font-medium hover:bg-y-soft transition-colors"
          >
            {t(locale, "landing.login")}
          </Link>
        </div>

        <PulsePreview locale={locale} />
      </section>

      <footer className="text-center text-xs text-ink-muted py-6">
        <Link href="/install-guide" className="underline underline-offset-2">
          {t(locale, "landing.installGuide")}
        </Link>
      </footer>
    </main>
  );
}

function PulsePreview({ locale }: { locale: "en" | "fa" }) {
  const labels = [
    t(locale, "landing.preview.circle"),
    t(locale, "landing.preview.moments"),
    t(locale, "landing.preview.pulse"),
  ];
  return (
    <div className="mt-14 grid grid-cols-3 gap-3 max-w-md w-full">
      {labels.map((label) => (
        <div
          key={label}
          className="rounded-y border border-y-soft bg-surface-light/70 dark:bg-surface-dark-muted/70 backdrop-blur px-3 py-4 text-xs text-ink-muted"
        >
          {label}
        </div>
      ))}
    </div>
  );
}
