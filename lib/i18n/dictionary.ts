export type Locale = "en" | "fa";

/**
 * Z's translation dictionary.
 *
 * Scope note (being upfront about coverage): this covers the highest-traffic
 * surfaces — landing, login/register, onboarding, the main nav, and Pulse's
 * header — end to end, in both directions, as a working demonstration of
 * the mechanism. Most of the rest of the app (Discover, Messages, Admin,
 * etc.) still has Persian text written directly in JSX rather than routed
 * through t(). Extending coverage means: add the string here under both
 * "en" and "fa", then replace the hardcoded Persian in that component with
 * t("that.key"). The infrastructure (cookie, switcher, RTL/LTR flip) already
 * works for whatever strings are wired through it.
 */
const dict = {
  en: {
    "brand.tagline": "Connect differently.",
    "brand.description": "Z is a lightweight, independent social network. Your circle, your moments, your pulse.",
    "landing.description": "Z is a light, personal space for the real people in your life — no clutter, no endless feed.",
    "landing.getStarted": "Get started",
    "landing.login": "Log in",
    "landing.signup": "Create account",
    "landing.installGuide": "How do I install Z?",
    "landing.preview.circle": "Circle",
    "landing.preview.moments": "Moments",
    "landing.preview.pulse": "Pulse",
    "auth.username": "Username",
    "auth.password": "Password",
    "auth.usernamePlaceholder": "mahsa_23",
    "auth.passwordPlaceholderMin": "At least 8 characters",
    "auth.createAccount": "Create account",
    "auth.creatingAccount": "Creating account...",
    "auth.haveAccount": "Already have an account?",
    "auth.login": "Log in",
    "auth.loginTitle": "Log in to Z",
    "auth.signupTitle": "Create your Z account",
    "auth.loggingIn": "Logging in...",
    "auth.noAccount": "Don't have an account?",
    "auth.signup": "Sign up",
    "auth.language": "Language",
    "onboarding.welcomeTitle": "Welcome to Z",
    "onboarding.welcomeDesc": "A light space for the real people in your life.",
    "onboarding.circleTitle": "Build your circle",
    "onboarding.circleDesc": "Find your friends and add them to your circle.",
    "onboarding.discoverTitle": "Discover new people",
    "onboarding.discoverDesc": "See suggested people in the Discover tab.",
    "onboarding.momentsTitle": "Share your moments",
    "onboarding.momentsDesc": "Text, photo, or video — moments disappear after 24 hours.",
    "onboarding.skip": "Skip",
    "onboarding.next": "Next",
    "onboarding.done": "Let's go",
    "nav.pulse": "Pulse",
    "nav.discover": "Discover",
    "nav.messages": "Messages",
    "nav.profile": "Profile",
  },
  fa: {
    "brand.tagline": "Connect differently.",
    "brand.description": "Z فضایی سبک و شخصی برای دایره‌ی واقعی آدم‌های زندگی‌ات است — بدون شلوغی، بدون فید بی‌پایان.",
    "landing.description": "Z فضایی سبک و شخصی برای دایره‌ی واقعی آدم‌های زندگی‌ات است — بدون شلوغی، بدون فید بی‌پایان.",
    "landing.getStarted": "شروع کن",
    "landing.login": "وارد شو",
    "landing.signup": "ساخت حساب",
    "landing.installGuide": "چگونه Z را نصب کنم؟",
    "landing.preview.circle": "دایره",
    "landing.preview.moments": "لحظه‌ها",
    "landing.preview.pulse": "پالس",
    "auth.username": "نام کاربری",
    "auth.password": "رمز عبور",
    "auth.usernamePlaceholder": "mahsa_23",
    "auth.passwordPlaceholderMin": "حداقل ۸ کاراکتر",
    "auth.createAccount": "ساخت حساب",
    "auth.creatingAccount": "در حال ساخت حساب...",
    "auth.haveAccount": "قبلاً حساب داری؟",
    "auth.login": "وارد شو",
    "auth.loginTitle": "ورود به Z",
    "auth.signupTitle": "ساخت حساب در Z",
    "auth.loggingIn": "در حال ورود...",
    "auth.noAccount": "حساب نداری؟",
    "auth.signup": "بساز",
    "auth.language": "زبان",
    "onboarding.welcomeTitle": "به Z خوش اومدی",
    "onboarding.welcomeDesc": "فضایی سبک برای دایره‌ی واقعی آدم‌های زندگی‌ات.",
    "onboarding.circleTitle": "دایره‌ات رو بساز",
    "onboarding.circleDesc": "دوستانت رو پیدا کن و به دایره‌ات اضافه کن.",
    "onboarding.discoverTitle": "آدم‌های جدید کشف کن",
    "onboarding.discoverDesc": "در بخش کشف، افراد پیشنهادی رو ببین.",
    "onboarding.momentsTitle": "لحظه‌هاتو به اشتراک بذار",
    "onboarding.momentsDesc": "متن، عکس یا ویدیو — لحظه‌ها بعد از ۲۴ ساعت پاک می‌شن.",
    "onboarding.skip": "رد کردن",
    "onboarding.next": "بعدی",
    "onboarding.done": "بزن بریم",
    "nav.pulse": "پالس",
    "nav.discover": "کشف",
    "nav.messages": "پیام‌ها",
    "nav.profile": "پروفایل",
  },
} as const;

export type DictKey = keyof typeof dict.en;

export function t(locale: Locale, key: DictKey): string {
  return dict[locale][key] ?? dict.en[key] ?? key;
}
