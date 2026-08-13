import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: "delete failed" }, { status: 500 });

  await admin.from("admin_logs").insert({
    admin_id: user.id,
    action: "post_deleted_by_admin",
    target_type: "post",
    target_id: params.id,
  });

  return NextResponse.json({ ok: true });
}
