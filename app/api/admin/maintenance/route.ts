import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const Schema = z.object({
  maintenanceMode: z.boolean(),
  message: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, username").eq("id", user.id).maybeSingle();
  // Deliberately super_admin only — this is powerful enough (locks out
  // every other admin too) that a regular "admin" shouldn't be able to
  // flip it, only the super_admin.
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid input" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("app_settings")
    .update({
      maintenance_mode: parsed.data.maintenanceMode,
      maintenance_message: parsed.data.message ?? null,
      maintenance_enabled_by: parsed.data.maintenanceMode ? user.id : null,
      maintenance_enabled_at: parsed.data.maintenanceMode ? new Date().toISOString() : null,
    })
    .eq("id", true);

  if (error) return NextResponse.json({ error: "update failed" }, { status: 500 });

  await admin.from("admin_logs").insert({
    admin_id: user.id,
    action: parsed.data.maintenanceMode ? "maintenance_mode_enabled" : "maintenance_mode_disabled",
    target_type: "app_settings",
    metadata: { message: parsed.data.message ?? null },
  });

  return NextResponse.json({ ok: true });
}
