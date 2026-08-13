import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function AdminLogsPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: logs } = await admin
    .from("admin_logs")
    .select("id, admin_id, action, target_type, target_id, created_at, profiles!admin_logs_admin_id_fkey(username)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main dir="rtl" className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/admin/dashboard" className="text-sm text-y-royal">
        &larr; بازگشت
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-2">لاگ‌های ادمین</h1>
      <p className="text-xs text-ink-muted mb-6">
        این فهرست فقط‌خواندنی است و همه‌ی عملیات حساس ادمین را برای ممیزی ثبت می‌کند.
      </p>

      <div className="divide-y divide-y-soft text-sm">
        {logs?.map((l: any) => (
          <div key={l.id} className="py-3 flex items-center justify-between">
            <div>
              <p>
                <span className="font-medium">@{l.profiles?.username}</span> — {l.action}
                {l.target_type && <span className="text-ink-muted"> ({l.target_type})</span>}
              </p>
            </div>
            <span className="text-xs text-ink-muted">{formatDistanceToNow(new Date(l.created_at))}</span>
          </div>
        ))}
        {(!logs || logs.length === 0) && (
          <p className="text-sm text-ink-muted py-8 text-center">هنوز لاگی ثبت نشده.</p>
        )}
      </div>
    </main>
  );
}
