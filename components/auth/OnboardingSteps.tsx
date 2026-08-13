"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ZLogo } from "@/components/ui/ZLogo";
import { t, type Locale } from "@/lib/i18n/dictionary";

export function OnboardingSteps({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const STEPS = [
    { title: t(locale, "onboarding.welcomeTitle"), desc: t(locale, "onboarding.welcomeDesc") },
    { title: t(locale, "onboarding.circleTitle"), desc: t(locale, "onboarding.circleDesc") },
    { title: t(locale, "onboarding.discoverTitle"), desc: t(locale, "onboarding.discoverDesc") },
    { title: t(locale, "onboarding.momentsTitle"), desc: t(locale, "onboarding.momentsDesc") },
  ];
  const isLast = step === STEPS.length - 1;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 bg-y-soft/40">
      <ZLogo size={48} />
      <h1 className="mt-6 text-xl font-bold text-center">{STEPS[step].title}</h1>
      <p className="mt-2 text-sm text-ink-muted text-center max-w-xs">{STEPS[step].desc}</p>

      <div className="flex gap-1.5 mt-8">
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-y-royal" : "w-1.5 bg-y-lavender"}`} />
        ))}
      </div>

      <div className="mt-10 flex gap-3">
        <button onClick={() => router.push("/pulse")} className="text-sm text-ink-muted">
          {t(locale, "onboarding.skip")}
        </button>
        <button
          onClick={() => (isLast ? router.push("/pulse") : setStep((s) => s + 1))}
          className="bg-y-royal text-white rounded-y px-6 py-2.5 text-sm font-medium hover:bg-y-deep transition-colors"
        >
          {isLast ? t(locale, "onboarding.done") : t(locale, "onboarding.next")}
        </button>
      </div>
    </main>
  );
}
