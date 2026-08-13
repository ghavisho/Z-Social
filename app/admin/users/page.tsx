import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminUsersPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: users } = await admin
    .from("profiles")
    .select("id, username, display_name, role, is_active, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main dir="rtl" className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/admin/dashboard" className="text-sm text-y-royal">
        &larr; بازگشت
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-6">کاربران</h1>

      <div className="divide-y divide-y-soft">
        {users?.map((u) => (
          <Link
            key={u.id}
            href={`/admin/users/${u.id}`}
            className="flex items-center justify-between py-3 text-sm hover:bg-y-soft/30 transition-colors -mx-2 px-2 rounded-y"
          >
            <div>
              <p className="font-medium">{u.display_name ?? u.username}</p>
              <p className="text-ink-muted text-xs">@{u.username} · {u.role}</p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                u.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
              }`}
            >
              {u.is_active ? "فعال" : "غیرفعال"}
            </span>
          </Link>
        ))}
        {(!users || users.length === 0) && (
          <p className="text-sm text-ink-muted py-8 text-center">کاربری یافت نشد.</p>
        )}
      </div>
    </main>
  );
}
