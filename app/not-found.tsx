import Link from "next/link";
import { ZLogo } from "@/components/ui/ZLogo";

export default function NotFound() {
  return (
    <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-y-soft/30">
      <ZLogo size={44} />
      <p className="text-lg font-semibold mt-6 mb-2">این صفحه پیدا نشد</p>
      <p className="text-sm text-ink-muted mb-6 max-w-xs">
        شاید لینک اشتباه بوده، یا محتوا حذف شده باشد.
      </p>
      <Link
        href="/pulse"
        className="bg-y-royal text-white rounded-y px-5 py-2.5 text-sm font-medium hover:bg-y-deep transition-colors"
      >
        بازگشت به پالس
      </Link>
    </div>
  );
}
