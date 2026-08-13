import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";

const BUCKETS = ["avatars", "posts", "moments", "messages", "voice"] as const;

export default async function AdminFilesPage() {
  await requireAdmin();
  const admin = createAdminClient();

  // Shallow overview only: for each bucket, list the top-level folders
  // (one per contributing user). Getting an exact file count/size would
  // require recursively listing every user folder — expensive at scale —
  // so this reports "how many users have uploaded something", which is
  // enough for a free-tier usage sanity check, not a full storage browser.
  const overview = await Promise.all(
    BUCKETS.map(async (bucket) => {
      const { data, error } = await admin.storage.from(bucket).list("", { limit: 1000 });
      return { bucket, folderCount: error ? null : data?.length ?? 0, error: error?.message };
    })
  );

  return (
    <main dir="rtl" className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/admin/dashboard" className="text-sm text-y-royal">
        &larr; بازگشت
      </Link>
      <h1 className="text-2xl font-bold mt-3 mb-2">فایل‌ها</h1>
      <p className="text-xs text-ink-muted mb-6">
        نمای کلی سطحی از بادکت‌های Storage — تعداد کاربرانی که در هر بادکت فایل آپلود کرده‌اند. برای مدیریت
        دقیق‌تر فایل‌ها، از داشبورد خودِ Supabase (بخش Storage) استفاده کن.
      </p>

      <div className="space-y-2">
        {overview.map((o) => (
          <div key={o.bucket} className="flex items-center justify-between rounded-y border border-y-soft px-4 py-3 text-sm">
            <span className="font-medium">{o.bucket}</span>
            {o.error ? (
              <span className="text-xs text-danger">خطا: {o.error}</span>
            ) : (
              <span className="text-ink-muted">{o.folderCount} کاربر</span>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
