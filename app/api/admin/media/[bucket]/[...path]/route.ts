import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const ALLOWED_BUCKETS = new Set(["avatars", "posts", "moments", "messages", "voice"]);

/**
 * Admin media proxy: /api/admin/media/{bucket}/{...path}
 *
 * The normal proxy (/api/media/...) resolves a signed URL using the
 * viewer's own session, so Storage RLS enforces "only conversation
 * members / friends / the author can see this" — which is exactly right
 * for the regular app, but means an admin reviewing a reported photo or a
 * deleted post's attached image would get a 404, since an admin isn't a
 * conversation member or friend of the people involved.
 *
 * This route exists ONLY for admin surfaces: it checks the requester's
 * profiles.role directly (not Storage RLS), then uses the service-role key
 * to sign the URL regardless of the normal relationship rules. It must
 * never be linked to from anywhere outside /admin pages.
 */
export async function GET(
  _request: Request,
  { params }: { params: { bucket: string; path: string[] } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!ALLOWED_BUCKETS.has(params.bucket)) {
    return NextResponse.json({ error: "invalid bucket" }, { status: 400 });
  }

  const admin = createAdminClient();
  const storagePath = params.path.join("/");
  const { data, error } = await admin.storage.from(params.bucket).createSignedUrl(storagePath, 120);

  if (error || !data) return NextResponse.json({ error: "not found" }, { status: 404 });

  return NextResponse.redirect(data.signedUrl, { status: 307 });
}
