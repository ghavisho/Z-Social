import { getPreferences } from "@/lib/theme/preferences";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  const { locale } = getPreferences();
  return <LoginForm locale={locale} />;
}
