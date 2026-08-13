import { createClient } from "@/lib/supabase/server";
import { ZLogo } from "@/components/ui/ZLogo";

export default async function MaintenancePage() {
  const supabase = createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("maintenance_message")
    .eq("id", true)
    .maybeSingle();

  return (
    <main dir="rtl" className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-y-soft/40">
      <ZLogo size={56} />
      <h1 className="mt-6 text-xl font-bold">Z موقتاً در دسترس نیست</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-muted leading-7">
        {settings?.maintenance_message ||
          "در حال انجام یک تعمیر یا به‌روزرسانی هستیم. لطفاً کمی بعد دوباره سر بزن."}
      </p>
    </main>
  );
}
