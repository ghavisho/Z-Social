import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AdminDeleteButton } from "@/components/admin/AdminDeleteButton";
import { DeletedTag } from "@/components/admin/DeletedTag";

export default async function AdminPostsPage() {
  const { admin: viewer } = await requireAdmin();
  const admin = createAdminClient();
  const isSuperAdmin = viewer.role === "super_admin";

  let query = admin
    .from("posts")
    .select("id, body, created_at, deleted_at, profiles!posts_author_id_fkey(username), post_media(storage_path, media_type)")
    .order("created_at", { ascending: false })
    .limit(100);

  // Deleted content (something a user removed themselves) is invisible to
  // everyone except the super_admin — a regular admin's moderation view
  // only ever shows what's currently live.
  if (!isSuperAdmin) query = query.is("deleted_at", null);

  const { data: posts } = await query;

  return (
    <main dir="rtl" className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/admin/dashboard" className="text-sm text-y-royal">
        &larr; بازگشت
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-1">پست‌ها</h1>
      {isSuperAdmin && (
        <p className="text-xs text-ink-muted mb-6">
          به‌عنوان مدیر اصلی، پست‌های حذف‌شده توسط کاربران هم با برچسب قرمز اینجا قابل‌مشاهده‌اند.
        </p>
      )}
      {!isSuperAdmin && <div className="mb-6" />}

      <div className="divide-y divide-y-soft">
        {posts?.map((p: any) => (
          <div key={p.id} className="flex items-start justify-between gap-3 py-3 text-sm">
            <div className="flex-1">
              <p className="text-ink-muted text-xs mb-1">@{p.profiles?.username}</p>
              <p className={p.deleted_at ? "line-through text-ink-muted" : ""}>{p.body}</p>
              {p.post_media?.[0] && (
                <div className="mt-2">
                  {p.post_media[0].media_type === "image" ? (
                    <img src={`/api/admin/media/posts/${p.post_media[0].storage_path}`} alt="" className="max-w-[160px] rounded-y" />
                  ) : p.post_media[0].media_type === "video" ? (
                    <video src={`/api/admin/media/posts/${p.post_media[0].storage_path}`} controls className="max-w-[200px] rounded-y" />
                  ) : null}
                </div>
              )}
            </div>
            {!p.deleted_at && (
              <AdminDeleteButton targetType="post" targetId={p.id} endpoint={`/api/admin/posts/${p.id}`} />
            )}
            {p.deleted_at && <DeletedTag />}
          </div>
        ))}
        {(!posts || posts.length === 0) && (
          <p className="text-sm text-ink-muted py-8 text-center">پستی وجود ندارد.</p>
        )}
      </div>
    </main>
  );
}
