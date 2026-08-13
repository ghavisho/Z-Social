import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ZDock } from "@/components/layout/ZDock";
import { InstallZ } from "@/components/layout/InstallZ";
import { PrivacySettings } from "@/components/settings/PrivacySettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { LogoutButton } from "@/components/settings/LogoutButton";
import { AvatarUpload } from "@/components/settings/AvatarUpload";
import { getPreferences } from "@/lib/theme/preferences";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const { locale, theme, accent } = getPreferences();

  return (
    <main dir="rtl" className="max-w-xl mx-auto px-4 pb-28 pt-6">
      <h1 className="text-2xl font-bold mb-6">تنظیمات</h1>

      <section className="mb-8 flex flex-col items-center">
        <AvatarUpload userId={user.id} currentUrl={profile?.avatar_url ?? null} />
        <p className="text-sm font-medium mt-2">{profile?.display_name ?? profile?.username}</p>
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-y-deep mb-3">ظاهر</h2>
        <AppearanceSettings locale={locale} theme={theme} accent={accent} />
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-y-deep mb-3">اپلیکیشن</h2>
        <InstallZ />
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-y-deep mb-3">حریم خصوصی</h2>
        <PrivacySettings />
      </section>

      <section className="mb-8">
        <h2 className="text-sm font-semibold text-y-deep mb-3">حساب</h2>
        <Link href="/settings/change-password" className="text-sm text-y-royal block mb-4">
          تغییر رمز عبور
        </Link>
        <LogoutButton />
      </section>

      <ZDock />
    </main>
  );
}
