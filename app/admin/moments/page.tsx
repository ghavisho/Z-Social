import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AdminDeleteButton } from "@/components/admin/AdminDeleteButton";

export default async function AdminMomentsPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: moments } = await admin
    .from("moments")
    .select("id, media_type, text_content, created_at, expires_at, profiles!moments_author_id_fkey(username)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main dir="rtl" className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/admin/dashboard" className="text-sm text-y-royal">
        &larr; بازگشت
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-6">لحظه‌ها</h1>

      <div className="divide-y divide-y-soft">
        {moments?.map((m: any) => {
          const expired = new Date(m.expires_at) < new Date();
          return (
            <div key={m.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div className="flex-1">
                <p className="text-ink-muted text-xs mb-1">
                  @{m.profiles?.username} · {m.media_type}
                </p>
                {m.text_content && <p>{m.text_content}</p>}
              </div>
              {expired ? (
                <span className="text-xs text-ink-muted flex-shrink-0">منقضی</span>
              ) : (
                <AdminDeleteButton targetType="moment" targetId={m.id} endpoint={`/api/admin/moments/${m.id}`} />
              )}
            </div>
          );
        })}
        {(!moments || moments.length === 0) && (
          <p className="text-sm text-ink-muted py-8 text-center">لحظه‌ای وجود ندارد.</p>
        )}
      </div>
    </main>
  );
}
