import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const Schema = z.object({
  action: z.enum(["deactivate", "reactivate", "ban_ip", "ban_device"]),
  reason: z.string().max(500).optional(),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: viewer } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!viewer || (viewer.role !== "admin" && viewer.role !== "super_admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });
  const { action, reason } = parsed.data;

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("id, username, role")
    .eq("id", params.id)
    .maybeSingle();

  if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });
  // Admins can't ban other admins/super_admins through this endpoint —
  // prevents an ordinary admin account (if ever compromised) from being
  // used to silence other moderators.
  if (target.role === "admin" || target.role === "super_admin") {
    return NextResponse.json({ error: "cannot moderate another admin" }, { status: 403 });
  }

  const { data: security } = await admin
    .from("profile_security_info")
    .select("registration_ip, last_login_ip, device_id")
    .eq("user_id", target.id)
    .maybeSingle();

  if (action === "deactivate" || action === "reactivate") {
    const { error } = await admin
      .from("profiles")
      .update({ is_active: action === "reactivate" })
      .eq("id", target.id);
    if (error) return NextResponse.json({ error: "update failed" }, { status: 500 });
  }

  if (action === "ban_ip") {
    const ip = security?.last_login_ip || security?.registration_ip;
    if (!ip) return NextResponse.json({ error: "این کاربر هیچ IP ثبت‌شده‌ای ندارد." }, { status: 400 });
    const { error } = await admin.from("banned_ips").upsert({ ip, reason: reason ?? null, banned_by: user.id });
    if (error) return NextResponse.json({ error: "ban failed" }, { status: 500 });
    // Banning an IP is meant to be a permanent, total lockout — deactivate
    // the account too, not just block future requests from that address.
    await admin.from("profiles").update({ is_active: false }).eq("id", target.id);
  }

  if (action === "ban_device") {
    if (!security?.device_id) return NextResponse.json({ error: "این کاربر هیچ شناسه‌ی دستگاهی ندارد." }, { status: 400 });
    const { error } = await admin
      .from("banned_devices")
      .upsert({ device_id: security.device_id, reason: reason ?? null, banned_by: user.id });
    if (error) return NextResponse.json({ error: "ban failed" }, { status: 500 });
    await admin.from("profiles").update({ is_active: false }).eq("id", target.id);
  }

  await admin.from("admin_logs").insert({
    admin_id: user.id,
    action: `member_${action}`,
    target_type: "profile",
    target_id: target.id,
    metadata: { username: target.username, reason: reason ?? null },
  });

  return NextResponse.json({ ok: true });
}
