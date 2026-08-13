import { getPreferences } from "@/lib/theme/preferences";
import { OnboardingSteps } from "@/components/auth/OnboardingSteps";

export default function OnboardingPage() {
  const { locale } = getPreferences();
  return <OnboardingSteps locale={locale} />;
}
