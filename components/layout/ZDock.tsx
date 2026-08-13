"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Compass, Plus, MessageCircle, User } from "lucide-react";
import { clsx } from "clsx";
import { t, type Locale } from "@/lib/i18n/dictionary";

function readLocaleCookie(): Locale {
  if (typeof document === "undefined") return "en";
  const match = document.cookie.match(/(?:^|; )z_lang=([^;]+)/);
  return match?.[1] === "fa" ? "fa" : "en";
}

/**
 * Z Dock — a floating pill nav, distinct from the classic 5-icon flat tab
 * bars of Instagram/TikTok/Facebook: the center item is an elevated "Orb"
 * that pops up above the bar rather than sitting flush in line with it.
 */
export function ZDock() {
  const pathname = usePathname();
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => setLocale(readLocaleCookie()), []);

  const ITEMS = [
    { href: "/pulse", label: t(locale, "nav.pulse"), icon: Activity },
    { href: "/discover", label: t(locale, "nav.discover"), icon: Compass },
    { href: "/create", label: "", icon: Plus, isOrb: true },
    { href: "/messages", label: t(locale, "nav.messages"), icon: MessageCircle },
    { href: "/profile/me", label: t(locale, "nav.profile"), icon: User },
  ];

  return (
    <nav
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-end gap-1 rounded-full bg-surface-light/90 dark:bg-charcoal/90 backdrop-blur border border-y-soft shadow-y px-3 py-2"
    >
      {ITEMS.map(({ href, label, icon: Icon, isOrb }) => {
        const active = pathname === href || pathname?.startsWith(href + "/");
        if (isOrb) {
          return (
            <Link
              key={href}
              href={href}
              aria-label={locale === "fa" ? "ایجاد محتوا" : "Create"}
              className="relative -top-4 flex items-center justify-center w-14 h-14 rounded-full bg-y-royal text-white shadow-y animate-orb-pop hover:bg-y-deep transition-colors"
            >
              <Icon size={26} />
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full transition-colors text-[11px]",
              active ? "text-y-royal" : "text-ink-muted hover:text-ink"
            )}
          >
            <Icon size={22} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
