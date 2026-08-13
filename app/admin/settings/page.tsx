import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { isAiEnabled } from "@/lib/ai/moderation";
import { MaintenanceToggle } from "@/components/admin/MaintenanceToggle";

export default async function AdminSettingsPage() {
  const { admin: viewer } = await requireAdmin();
  const admin = createAdminClient();

  const { count: totalUsers } = await admin.from("profiles").select("id", { count: "exact", head: true });
  const { count: adminCount } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("role", ["admin", "super_admin"]);

  const { data: appSettings } = await admin
    .from("app_settings")
    .select("maintenance_mode, maintenance_message")
    .eq("id", true)
    .maybeSingle();

  return (
    <main dir="rtl" className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/admin/dashboard" className="text-sm text-y-royal">
        &larr; بازگشت
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-2">تنظیمات سیستم</h1>
      <p className="text-xs text-ink-muted mb-6">
        تنظیمات واقعی (کلیدهای API، متغیرهای Supabase) از طریق Environment Variables در Vercel/`.env.local`
        مدیریت می‌شوند، نه از این صفحه — این صفحه فقط وضعیت فعلی را نشان می‌دهد.
      </p>

      <div className="space-y-2 text-sm mb-8">
        <Row label="تعداد کل کاربران" value={String(totalUsers ?? 0)} />
        <Row label="تعداد ادمین‌ها" value={String(adminCount ?? 0)} />
        <Row label="وضعیت AI" value={isAiEnabled() ? "فعال" : "غیرفعال (Z بدون آن هم کار می‌کند)"} />
      </div>

      {viewer.role === "super_admin" ? (
        <MaintenanceToggle
          initialEnabled={appSettings?.maintenance_mode ?? false}
          initialMessage={appSettings?.maintenance_message ?? null}
        />
      ) : (
        <p className="text-xs text-ink-muted rounded-y bg-y-soft/50 px-4 py-3">
          فقط مدیر اصلی (super_admin) می‌تواند حالت آفلاین کامل شبکه را تغییر دهد.
        </p>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-y bg-y-soft/50 px-4 py-3">
      <span>{label}</span>
      <span className="text-ink-muted">{value}</span>
    </div>
  );
}
