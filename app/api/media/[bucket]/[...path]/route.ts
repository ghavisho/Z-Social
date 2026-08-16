import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_BUCKETS = new Set(["avatars", "posts", "moments", "messages", "voice"]);

/**
 * Stable media URL: /api/media/{bucket}/{...path}
 *
 * Why this exists: private Supabase Storage buckets need short-lived
 * signed URLs, but next/image caches its optimized output keyed by the
 * SOURCE url — if that source is a signed URL, the signature can expire
 * before the cache does, breaking the image on revalidation.
 *
 * This route is a stable URL that never changes. Every time it's hit
 * (including by next/image's background revalidation), it generates a
 * FRESH signed URL server-side — using the caller's own session, so
 * Storage RLS is enforced exactly as if the client had called
 * createSignedUrl() directly — and redirects to it. next/image (and
 * plain <video>/<a> tags) can point at this permanently.
 */
export async function GET(
  _request: Request,
  { params }: { params: { bucket: string; path: string[] } }
) {
  if (!ALLOWED_BUCKETS.has(params.bucket)) {
    return NextResponse.json({ error: "invalid bucket" }, { status: 400 });
  }

  const supabase = createClient();
  const storagePath = params.path.join("/");

  const { data, error } = await supabase.storage
    .from(params.bucket)
    .createSignedUrl(storagePath, 120); // short-lived — we redirect immediately, no need for more

  if (error || !data) {
    // RLS denied access, or the file doesn't exist — either way, don't
    // leak which one via the response.
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.redirect(data.signedUrl, { status: 307 });
}
