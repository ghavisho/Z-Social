import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ResolveReportButton } from "@/components/admin/ResolveReportButton";

export default async function AdminReportsPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: reports } = await admin
    .from("reports")
    .select("id, reporter_id, target_type, target_id, reason, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main dir="rtl" className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/admin/dashboard" className="text-sm text-y-royal">
        &larr; بازگشت
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-6">گزارش‌ها</h1>

      <div className="space-y-3">
        {reports?.map((r) => (
          <div key={r.id} className="rounded-y border border-y-soft p-4 text-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium">{r.target_type}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  r.status === "open" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
                }`}
              >
                {r.status}
              </span>
            </div>
            <p className="text-ink-muted">{r.reason}</p>
            {r.status === "open" && <ResolveReportButton reportId={r.id} />}
          </div>
        ))}
        {(!reports || reports.length === 0) && (
          <p className="text-sm text-ink-muted py-8 text-center">گزارشی وجود ندارد.</p>
        )}
      </div>
    </main>
  );
}
