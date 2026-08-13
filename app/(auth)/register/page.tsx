import { getPreferences } from "@/lib/theme/preferences";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  const { locale } = getPreferences();
  return <RegisterForm locale={locale} />;
}
