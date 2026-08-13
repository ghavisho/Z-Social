"use client";

import { useEffect } from "react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // In a production setup, send this to an error-tracking service
    // (Sentry, etc). For now, at least keep it out of a silent white screen.
    console.error("Z — unhandled page error:", error);
  }, [error]);

  return (
    <div dir="rtl" className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-lg font-semibold mb-2">یک مشکل پیش اومد</p>
      <p className="text-sm text-ink-muted mb-6 max-w-xs">
        این صفحه با خطا مواجه شد. می‌تونی دوباره امتحان کنی، یا اگه ادامه داشت، به ما اطلاع بده.
      </p>
      <button
        onClick={reset}
        className="bg-y-royal text-white rounded-y px-5 py-2.5 text-sm font-medium hover:bg-y-deep transition-colors"
      >
        تلاش دوباره
      </button>
    </div>
  );
}
