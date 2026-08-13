import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PresenceHeartbeat } from "@/components/layout/PresenceHeartbeat";
import { getPreferences } from "@/lib/theme/preferences";

export const metadata: Metadata = {
  title: "Z — Connect differently.",
  description: "Z is a lightweight, independent social network. Your circle, your moments, your pulse.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Z",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#6E3AD1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading cookies here (Server Component, before first paint) means the
  // correct language/theme/accent are already in the HTML that reaches the
  // browser — no flash of the wrong language or a light flash before dark
  // mode kicks in, which is the usual failure mode of client-only toggles.
  const { locale, theme, accent } = getPreferences();

  return (
    <html
      lang={locale}
      dir={locale === "fa" ? "rtl" : "ltr"}
      className={theme === "dark" ? "dark" : undefined}
      data-accent={accent}
    >
      <body>
        {children}
        <PresenceHeartbeat />
        <RegisterServiceWorker />
      </body>
    </html>
  );
}

function RegisterServiceWorker() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            });
          }
        `,
      }}
    />
  );
}
