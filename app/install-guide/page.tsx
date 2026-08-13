import { ZLogo } from "@/components/ui/ZLogo";

export const metadata = { title: "چگونه Z را نصب کنم؟" };

export default function InstallGuidePage() {
  return (
    <main dir="rtl" className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center gap-2 mb-8">
        <ZLogo size={32} />
        <h1 className="text-2xl font-bold">چگونه Z را نصب کنم؟</h1>
      </div>

      <GuideSection title="اندروید / Chrome">
        <ol className="list-decimal list-inside space-y-2">
          <li>سایت Z را در Chrome باز کن.</li>
          <li>منوی سه‌نقطه‌ی Chrome را باز کن.</li>
          <li>گزینه‌ی «Add to Home Screen» یا «Install App» را انتخاب کن.</li>
          <li>روی «Install» بزن.</li>
          <li>آیکون Z روی صفحه‌ی اصلی گوشی‌ات قرار می‌گیرد.</li>
        </ol>
      </GuideSection>

      <GuideSection title="آیفون / Safari">
        <ol className="list-decimal list-inside space-y-2">
          <li>سایت Z را در Safari باز کن (نه در مرورگر دیگر).</li>
          <li>دکمه‌ی Share را بزن (آیکون مربع با فلش رو به بالا).</li>
          <li>گزینه‌ی «Add to Home Screen» را انتخاب کن.</li>
          <li>روی «Add» بزن.</li>
        </ol>
      </GuideSection>

      <GuideSection title="دسکتاپ / Chrome یا Edge">
        <ol className="list-decimal list-inside space-y-2">
          <li>سایت Z را باز کن.</li>
          <li>در نوار آدرس، آیکون نصب (⊕ یا کامپیوتر کوچک) را پیدا کن.</li>
          <li>روی «Install» بزن.</li>
        </ol>
      </GuideSection>

      <p className="text-sm text-ink-muted mt-8">
        بعد از نصب، Z مثل یک اپلیکیشن مستقل روی دستگاه‌ات اجرا می‌شود و حتی در حالت آفلاین
        بخشی از محتوا در دسترس می‌ماند.
      </p>
    </main>
  );
}

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-y-deep mb-3">{title}</h2>
      <div className="text-ink text-sm leading-7 bg-y-soft/60 rounded-y p-4">{children}</div>
    </section>
  );
}
