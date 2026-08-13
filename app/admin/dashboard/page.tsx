import { requireAdmin } from "@/lib/auth/requireAdmin";

export default async function AdminDashboardPage() {
  await requireAdmin();

  return (
    <main dir="rtl" className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">پنل مدیریت Z</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          ["/admin/users", "کاربران"],
          ["/admin/posts", "پست‌ها"],
          ["/admin/comments", "کامنت‌ها"],
          ["/admin/moments", "لحظه‌ها"],
          ["/admin/messages", "مکالمات"],
          ["/admin/reports", "گزارش‌ها"],
          ["/admin/files", "فایل‌ها"],
          ["/admin/logs", "لاگ‌ها"],
          ["/admin/settings", "تنظیمات"],
          ["/admin/deploy", "به‌روزرسانی (آپلود ZIP)"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            className="rounded-y border border-y-soft p-6 text-center hover:border-y-royal transition-colors"
          >
            {label}
          </a>
        ))}
      </div>
      <p className="text-xs text-ink-muted mt-8">
        هر عملیات حساس ادمین (مثل دسترسی به مکالمات یا حذف محتوا) در جدول admin_logs ثبت و قابل ممیزی است.
      </p>
    </main>
  );
}
