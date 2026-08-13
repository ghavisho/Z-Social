import { requireAdmin } from "@/lib/auth/requireAdmin";
import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ModerateUserActions } from "@/components/admin/ModerateUserActions";

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("id, username, display_name, role, is_active, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (!target) return notFound();

  const { data: security } = await admin
    .from("profile_security_info")
    .select("registration_ip, last_login_ip, device_id")
    .eq("user_id", target.id)
    .maybeSingle();

  const [{ data: recentPosts }, { data: recentComments }, { data: ipBan }, { data: deviceBan }] = await Promise.all([
    admin.from("posts").select("id, body, created_at").eq("author_id", target.id).order("created_at", { ascending: false }).limit(5),
    admin.from("comments").select("id, body, created_at").eq("author_id", target.id).order("created_at", { ascending: false }).limit(5),
    security?.registration_ip || security?.last_login_ip
      ? admin.from("banned_ips").select("ip").eq("ip", security.last_login_ip || security.registration_ip || "").maybeSingle()
      : Promise.resolve({ data: null }),
    security?.device_id
      ? admin.from("banned_devices").select("device_id").eq("device_id", security.device_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <main dir="rtl" className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/admin/users" className="text-sm text-y-royal">
        &larr; بازگشت
      </Link>

      <div className="flex items-center justify-between mt-3 mb-1">
        <h1 className="text-2xl font-bold">{target.display_name ?? target.username}</h1>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            target.is_active ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
          }`}
        >
          {target.is_active ? "فعال" : "غیرفعال"}
        </span>
      </div>
      <p className="text-sm text-ink-muted mb-6">
        @{target.username} · عضو شد {formatDistanceToNow(new Date(target.created_at))} پیش
      </p>

      <section className="rounded-y border border-y-soft p-4 mb-6 text-sm space-y-2">
        <h2 className="font-semibold text-y-deep mb-1">اطلاعات فنی (برای بررسی مشکوک‌بودن)</h2>
        <InfoRow label="IP ثبت‌نام" value={security?.registration_ip ?? null} banned={!!ipBan && security?.registration_ip === (ipBan as any)?.ip} />
        <InfoRow label="آخرین IP ورود" value={security?.last_login_ip ?? null} banned={!!ipBan && security?.last_login_ip === (ipBan as any)?.ip} />
        <InfoRow label="شناسه‌ی دستگاه" value={security?.device_id ?? null} banned={!!deviceBan} mono />
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-y-deep mb-2 text-sm">عملیات مدیریتی</h2>
        <ModerateUserActions
          userId={target.id}
          isActive={target.is_active}
          hasIp={!!(security?.registration_ip || security?.last_login_ip)}
          hasDevice={!!security?.device_id}
          ipAlreadyBanned={!!ipBan}
          deviceAlreadyBanned={!!deviceBan}
        />
      </section>

      <section className="mb-6">
        <h2 className="font-semibold text-y-deep mb-2 text-sm">پست‌های اخیر</h2>
        <div className="space-y-2">
          {recentPosts?.map((p) => (
            <div key={p.id} className="text-sm rounded-y bg-y-soft/40 px-3 py-2">
              {p.body}
              <p className="text-[11px] text-ink-muted mt-1">{formatDistanceToNow(new Date(p.created_at))} پیش</p>
            </div>
          ))}
          {(!recentPosts || recentPosts.length === 0) && <p className="text-xs text-ink-muted">پستی ثبت نکرده.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-y-deep mb-2 text-sm">کامنت‌های اخیر</h2>
        <div className="space-y-2">
          {recentComments?.map((c) => (
            <div key={c.id} className="text-sm rounded-y bg-y-soft/40 px-3 py-2">
              {c.body}
              <p className="text-[11px] text-ink-muted mt-1">{formatDistanceToNow(new Date(c.created_at))} پیش</p>
            </div>
          ))}
          {(!recentComments || recentComments.length === 0) && <p className="text-xs text-ink-muted">کامنتی ثبت نکرده.</p>}
        </div>
      </section>
    </main>
  );
}

function InfoRow({ label, value, banned, mono }: { label: string; value: string | null; banned?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-muted">{label}</span>
      <span className={`${mono ? "font-mono text-xs" : ""} ${banned ? "text-danger font-medium" : ""}`}>
        {value || "—"} {banned && "🔴 بلاک شده"}
      </span>
    </div>
  );
}
