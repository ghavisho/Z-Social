"use client";

import { useEffect, useState } from "react";
import { Download, CheckCircle2 } from "lucide-react";

/**
 * "Install Z" control — spec §21.
 * Shows a native install button when the browser fires beforeinstallprompt,
 * and shows "Z is installed" once installed / running in standalone mode.
 */
export function InstallZ() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(standalone);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (isInstalled) {
    return (
      <div className="flex items-center gap-2 rounded-y border border-success/30 bg-success/10 px-4 py-3 text-success text-sm">
        <CheckCircle2 size={18} />
        Z is installed
      </div>
    );
  }

  if (deferredPrompt) {
    return (
      <button
        onClick={async () => {
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          setDeferredPrompt(null);
        }}
        className="flex items-center gap-2 rounded-y bg-y-royal px-4 py-3 text-white text-sm font-medium hover:bg-y-deep transition-colors"
      >
        <Download size={18} />
        Install Z
      </button>
    );
  }

  return (
    <a
      href="/install-guide"
      className="flex items-center gap-2 rounded-y border border-y-lavender px-4 py-3 text-y-deep text-sm font-medium hover:bg-y-soft transition-colors"
    >
      <Download size={18} />
      راهنمای نصب Z
    </a>
  );
}
