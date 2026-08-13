// Y — Initial Super Admin seed script (spec §33)
//
// Usage:  npm run seed:admin
//
// Behavior:
// - Reads INITIAL_ADMIN_USERNAME / INITIAL_ADMIN_PASSWORD from env.
// - If a super_admin already exists, this script refuses to run (setup lock).
// - Creates the admin as a normal Supabase Auth user, then marks
//   profiles.role = 'super_admin' and password_change_required = true.
// - On first login, the app forces a password change (see app/(auth)/login).
//   Once changed, the initial password is no longer valid — Supabase Auth
//   itself owns the credential, so there is no separate backdoor to disable.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_USERNAME = process.env.INITIAL_ADMIN_USERNAME || "admin1234";
const ADMIN_PASSWORD = process.env.INITIAL_ADMIN_PASSWORD || "4321nimda";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("خطا: NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY باید در .env.local تنظیم شده باشند.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  const { data: existingAdmins, error: checkError } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "super_admin")
    .limit(1);

  if (checkError) {
    console.error("خطا در بررسی ادمین موجود:", checkError.message);
    process.exit(1);
  }

  if (existingAdmins && existingAdmins.length > 0) {
    console.log("یک Super Admin از قبل وجود دارد. Setup قفل است — این اسکریپت اجرا نمی‌شود.");
    process.exit(0);
  }

  const fakeEmail = `${ADMIN_USERNAME}@z.local`; // Supabase Auth requires an email; Z itself is username-based

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: fakeEmail,
    password: ADMIN_PASSWORD,
    email_confirm: true,
  });

  if (createError) {
    console.error("خطا در ساخت کاربر ادمین:", createError.message);
    process.exit(1);
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: created.user.id,
    username: ADMIN_USERNAME,
    display_name: "Y Admin",
    role: "super_admin",
    password_change_required: true,
  });

  if (profileError) {
    console.error("خطا در ساخت پروفایل ادمین:", profileError.message);
    process.exit(1);
  }

  console.log("Super Admin با موفقیت ساخته شد.");
  console.log(`Username: ${ADMIN_USERNAME}`);
  console.log("رمز عبور اولیه تنظیم شد — در اولین ورود، تغییر رمز اجباری است.");
}

main();
