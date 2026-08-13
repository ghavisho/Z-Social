import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { DeployUploader } from "@/components/admin/DeployUploader";
import { AlertTriangle } from "lucide-react";

export default async function AdminDeployPage() {
  const { admin: viewer } = await requireAdmin();

  if (viewer.role !== "super_admin") {
    return (
      <main dir="rtl" className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/admin/dashboard" className="text-sm text-y-royal">
          &larr; بازگشت
        </Link>
        <p className="text-sm text-ink-muted mt-6">فقط مدیر اصلی (super_admin) به این بخش دسترسی دارد.</p>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: recentDeploys } = await admin
    .from("admin_logs")
    .select("id, admin_id, created_at, metadata, profiles!admin_logs_admin_id_fkey(username)")
    .eq("action", "code_deployed_via_zip_upload")
    .order("created_at", { ascending: false })
    .limit(10);

  const isConfigured = Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);

  return (
    <main dir="rtl" className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/admin/dashboard" className="text-sm text-y-royal">
        &larr; بازگشت
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-2">به‌روزرسانی Z (آپلود ZIP)</h1>
      <p className="text-sm text-ink-muted mb-6">
        هر بار که یک فایل ZIP جدید از کد Z را دریافت کردی، همین‌جا آپلودش کن — سایت خودکار Build و منتشر می‌شود.
        دیتابیس (کاربران، پست‌ها، پیام‌ها، همه‌چیز) کاملاً جدا از این فرآیند است و هیچ‌وقت پاک یا مختل نمی‌شود.
      </p>

      {!isConfigured && (
        <div className="flex items-start gap-2 rounded-y border border-warning/40 bg-warning/10 px-4 py-3 mb-6 text-xs text-ink">
          <AlertTriangle size={16} className="text-warning flex-shrink-0 mt-0.5" />
          <div>
            این قابلیت هنوز فعال نیست. باید سه مقدار زیر را در Environment Variables سرویس میزبانی‌ات اضافه
            کنی: <code className="font-mono">GITHUB_TOKEN</code>، <code className="font-mono">GITHUB_OWNER</code>،{" "}
            <code className="font-mono">GITHUB_REPO</code>. راهنمای کامل گرفتن این مقادیر در README بخش
            «به‌روزرسانی از پنل ادمین» هست.
          </div>
        </div>
      )}

      <DeployUploader />

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-y-deep mb-3">تاریخچه‌ی به‌روزرسانی‌ها</h2>
        <div className="divide-y divide-y-soft">
          {recentDeploys?.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p>@{d.profiles?.username}</p>
                <p className="text-xs text-ink-muted">
                  {d.metadata?.fileCount ? `${d.metadata.fileCount} فایل` : ""} {d.metadata?.zipName ? `— ${d.metadata.zipName}` : ""}
                </p>
              </div>
              <span className="text-xs text-ink-muted">{formatDistanceToNow(new Date(d.created_at))} پیش</span>
            </div>
          ))}
          {(!recentDeploys || recentDeploys.length === 0) && (
            <p className="text-xs text-ink-muted py-4 text-center">هنوز به‌روزرسانی‌ای از این طریق انجام نشده.</p>
          )}
        </div>
      </section>
    </main>
  );
}
