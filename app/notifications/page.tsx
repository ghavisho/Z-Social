import { createClient } from "@/lib/supabase/server";
import { ZDock } from "@/components/layout/ZDock";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageSquare, UserPlus, UserCheck, Zap, Phone, UserSearch } from "lucide-react";

const ICONS: Record<string, any> = {
  like: Heart,
  comment: MessageSquare,
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  moment_view: Zap,
  call: Phone,
  message: MessageSquare,
  new_member: UserSearch,
};

const LABELS: Record<string, string> = {
  like: "پست تو را پسندید",
  comment: "روی پست تو نظر گذاشت",
  friend_request: "درخواست دوستی فرستاد",
  friend_accepted: "درخواست دوستی‌ات را پذیرفت",
  moment_view: "لحظه‌ی تو را دید",
  call: "با تو تماس گرفت",
  message: "برایت پیام فرستاد",
  new_member: "به Z پیوست — برای بررسی بزن",
};

export default async function NotificationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, is_read, created_at, actor:profiles!notifications_actor_id_fkey(id, username, display_name)")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  // Mark all as read once viewed.
  await supabase.from("notifications").update({ is_read: true }).eq("recipient_id", user.id).eq("is_read", false);

  return (
    <main dir="rtl" className="max-w-xl mx-auto px-4 pb-28 pt-6">
      <h1 className="text-2xl font-bold mb-6">اعلان‌ها</h1>

      <div className="divide-y divide-y-soft">
        {notifications?.map((n: any) => {
          const Icon = ICONS[n.type] ?? Heart;
          const row = (
            <div className={`flex items-center gap-3 py-3 ${!n.is_read ? "bg-y-soft/30" : ""}`}>
              <div className="w-9 h-9 rounded-full bg-y-soft flex items-center justify-center text-y-royal flex-shrink-0">
                <Icon size={16} />
              </div>
              <div className="flex-1 text-sm">
                <span className="font-medium">{n.actor?.display_name ?? n.actor?.username ?? "Z"}</span>{" "}
                {LABELS[n.type] ?? n.type}
              </div>
              <span className="text-[11px] text-ink-muted flex-shrink-0">
                {formatDistanceToNow(new Date(n.created_at))}
              </span>
            </div>
          );
          if (!n.actor?.username) return <div key={n.id}>{row}</div>;

          const href = n.type === "new_member" ? `/admin/users/${n.actor.id}` : `/profile/${n.actor.username}`;
          return (
            <Link key={n.id} href={href} className="block hover:bg-y-soft/20 -mx-2 px-2 rounded-y transition-colors">
              {row}
            </Link>
          );
        })}
        {(!notifications || notifications.length === 0) && (
          <p className="text-sm text-ink-muted text-center py-16">هنوز اعلانی نداری.</p>
        )}
      </div>

      <ZDock />
    </main>
  );
}
