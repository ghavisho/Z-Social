import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const Schema = z.object({ newPassword: z.string().min(8).max(72) });

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "وارد نشده‌ای." }, { status: 401 });
  }

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "رمز عبور معتبر نیست." }, { status: 400 });
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: parsed.data.newPassword });
  if (updateError) {
    return NextResponse.json({ error: "امکان تغییر رمز وجود نداشت." }, { status: 500 });
  }

  const admin = createAdminClient();
  await admin.from("profiles").update({ password_change_required: false }).eq("id", user.id);
  await admin.from("admin_logs").insert({
    admin_id: user.id,
    action: "password_changed",
    metadata: { self_service: true },
  });

  return NextResponse.json({ ok: true });
}
