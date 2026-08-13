import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { DeletedTag } from "@/components/admin/DeletedTag";

export default async function AdminCommentsPage() {
  const { admin: viewer } = await requireAdmin();
  const admin = createAdminClient();
  const isSuperAdmin = viewer.role === "super_admin";

  let query = admin
    .from("comments")
    .select("id, body, created_at, deleted_at, profiles!comments_author_id_fkey(username), posts(id, body)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!isSuperAdmin) query = query.is("deleted_at", null);

  const { data: comments } = await query;

  return (
    <main dir="rtl" className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/admin/dashboard" className="text-sm text-y-royal">
        &larr; بازگشت
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-1">کامنت‌ها</h1>
      {isSuperAdmin && (
        <p className="text-xs text-ink-muted mb-6">
          به‌عنوان مدیر اصلی، کامنت‌های حذف‌شده توسط کاربران هم با برچسب قرمز اینجا قابل‌مشاهده‌اند.
        </p>
      )}
      {!isSuperAdmin && <div className="mb-6" />}

      <div className="divide-y divide-y-soft">
        {comments?.map((c: any) => (
          <div key={c.id} className="flex items-start justify-between gap-3 py-3 text-sm">
            <div className="flex-1">
              <p className="text-ink-muted text-xs mb-1">
                @{c.profiles?.username} · روی پست: «{c.posts?.body?.slice(0, 40) ?? "—"}»
              </p>
              <p className={c.deleted_at ? "line-through text-ink-muted" : ""}>{c.body}</p>
            </div>
            {c.deleted_at && <DeletedTag />}
          </div>
        ))}
        {(!comments || comments.length === 0) && (
          <p className="text-sm text-ink-muted py-8 text-center">کامنتی وجود ندارد.</p>
        )}
      </div>
    </main>
  );
}
