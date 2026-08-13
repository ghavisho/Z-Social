import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function AdminMessagesPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: conversations } = await admin
    .from("conversations")
    .select("id, is_group, title, created_at, conversation_members(user_id, profiles!conversation_members_user_id_fkey(username))")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main dir="rtl" className="max-w-3xl mx-auto px-6 py-10">
      <Link href="/admin/dashboard" className="text-sm text-y-royal">
        &larr; بازگشت
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-2">مکالمات</h1>
      <p className="text-xs text-danger bg-danger/10 rounded-y px-3 py-2 mb-6">
        ⚠️ باز کردن جزئیات یک مکالمه در جدول admin_logs ثبت می‌شود و طبق سیاست حریم خصوصی Z، فقط باید در شرایط
        مدیریتی مشخص (بررسی گزارش، تخلف) استفاده شود — نه کنجکاوی.
      </p>

      <div className="divide-y divide-y-soft">
        {conversations?.map((c: any) => {
          const usernames = c.conversation_members?.map((m: any) => m.profiles?.username).filter(Boolean) ?? [];
          return (
            <Link
              key={c.id}
              href={`/admin/messages/${c.id}`}
              className="flex items-center justify-between py-3 text-sm hover:bg-y-soft/30 transition-colors -mx-2 px-2 rounded-y"
            >
              <span>{usernames.map((u: string) => `@${u}`).join(" ↔ ") || "مکالمه"}</span>
              <span className="text-xs text-ink-muted">{c.is_group ? "گروهی" : "خصوصی"}</span>
            </Link>
          );
        })}
        {(!conversations || conversations.length === 0) && (
          <p className="text-sm text-ink-muted py-8 text-center">مکالمه‌ای وجود ندارد.</p>
        )}
      </div>
    </main>
  );
}
