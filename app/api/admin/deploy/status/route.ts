import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLatestNetlifyDeployStatus } from "@/lib/deploy/github";

export async function GET(_request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const netlifyToken = process.env.NETLIFY_TOKEN;
  const siteId = process.env.NETLIFY_SITE_ID;

  // Netlify status is optional — the push to GitHub already succeeded by
  // the time this is polled, so without these two vars we just tell the
  // admin to check their Netlify dashboard instead of showing live status.
  if (!netlifyToken || !siteId) {
    return NextResponse.json({ readyState: "UNKNOWN", note: "Netlify status not configured — check your Netlify dashboard." });
  }

  const status = await getLatestNetlifyDeployStatus({ token: netlifyToken, siteId });
  if (!status) {
    return NextResponse.json({ readyState: "UNKNOWN" });
  }

  // Normalize Netlify's states to the same three buckets the UI expects.
  const readyState =
    status.state === "ready"
      ? "READY"
      : status.state === "error"
      ? "ERROR"
      : status.state === "building" || status.state === "processing" || status.state === "new"
      ? "BUILDING"
      : "UNKNOWN";

  return NextResponse.json({ readyState, url: status.deployUrl });
}
