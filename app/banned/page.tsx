import { ZLogo } from "@/components/ui/ZLogo";

export default function BannedPage() {
  return (
    <main dir="rtl" className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-y-soft/40">
      <ZLogo size={56} />
      <h1 className="mt-6 text-xl font-bold text-danger">دسترسی مسدود شده</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted leading-7">
        دسترسی این دستگاه یا آدرس اینترنتی به Z توسط مدیریت شبکه به‌طور دائم قطع شده است. اگر فکر می‌کنی
        این یک اشتباه است، از طریق راه‌های دیگر با تیم پشتیبانی تماس بگیر.
      </p>
    </main>
  );
}
