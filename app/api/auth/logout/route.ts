import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const admin = createAdminClient();
    await admin
      .from("user_presence")
      .upsert({ user_id: user.id, status: "offline", last_seen_at: new Date().toISOString() });
  }

  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
