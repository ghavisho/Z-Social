import { createClient } from "@/lib/supabase/server";
import { ZDock } from "@/components/layout/ZDock";
import { FriendActionButton } from "@/components/profile/FriendActionButton";
import { MessageButton } from "@/components/profile/MessageButton";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Settings as SettingsIcon } from "lucide-react";

const TABS = ["دایره", "فعالیت", "پست‌ها", "لحظه‌ها"];

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const usernameQuery = params.username === "me" ? undefined : params.username;

  let profile;
  if (usernameQuery) {
    const { data } = await supabase.from("profiles").select("*").eq("username", usernameQuery).maybeSingle();
    profile = data;
  } else if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    profile = data;
  }

  if (!profile) return notFound();

  const isOwnProfile = user?.id === profile.id;

  let friendState: "none" | "pending_sent" | "pending_received" | "friends" = "none";
  if (!isOwnProfile && user) {
    const [userA, userB] = [user.id, profile.id].sort();
    const { data: friendship } = await supabase
      .from("friendships")
      .select("id")
      .eq("user_a", userA)
      .eq("user_b", userB)
      .maybeSingle();
    if (friendship) {
      friendState = "friends";
    } else {
      const { data: sentReq } = await supabase
        .from("friend_requests")
        .select("id")
        .eq("sender_id", user.id)
        .eq("receiver_id", profile.id)
        .eq("status", "pending")
        .maybeSingle();
      const { data: receivedReq } = await supabase
        .from("friend_requests")
        .select("id")
        .eq("sender_id", profile.id)
        .eq("receiver_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      if (sentReq) friendState = "pending_sent";
      else if (receivedReq) friendState = "pending_received";
    }
  }

  return (
    <main dir="rtl" className="max-w-xl mx-auto pb-28">
      <div className="h-28 bg-gradient-to-l from-y-royal to-y-deep" />
      <div className="px-4 -mt-10">
        <div className="relative w-20 h-20 rounded-full bg-surface-light border-4 border-surface-light shadow-y flex items-center justify-center text-2xl font-bold text-y-deep bg-y-lavender overflow-hidden">
          {profile.avatar_url ? (
            <Image src={profile.avatar_url} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            (profile.display_name ?? profile.username)[0]?.toUpperCase()
          )}
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            <h1 className="text-xl font-bold">{profile.display_name ?? profile.username}</h1>
            <p className="text-sm text-ink-muted">@{profile.username}</p>
          </div>
          {!isOwnProfile && user && (
            <div className="flex items-center gap-2">
              {friendState === "friends" && <MessageButton targetUserId={profile.id} />}
              <FriendActionButton targetUserId={profile.id} initialState={friendState} />
            </div>
          )}
          {isOwnProfile && (
            <Link
              href="/settings"
              className="w-9 h-9 rounded-full border border-y-soft flex items-center justify-center text-ink-muted hover:text-y-royal hover:border-y-lavender transition-colors"
              aria-label="تنظیمات"
            >
              <SettingsIcon size={16} />
            </Link>
          )}
        </div>
        {profile.bio && <p className="text-sm mt-2 leading-6">{profile.bio}</p>}
      </div>

      <div className="flex gap-6 px-4 mt-6 border-b border-y-soft text-sm">
        {TABS.map((t, i) => (
          <button key={t} className={i === 0 ? "text-y-royal border-b-2 border-y-royal pb-2" : "text-ink-muted pb-2"}>
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 py-8 text-center text-sm text-ink-muted">هنوز محتوایی نیست.</div>

      <ZDock />
    </main>
  );
}
