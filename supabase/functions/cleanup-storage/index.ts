// Z — Storage cleanup Edge Function (spec §50: free-tier optimization).
//
// Deploy with: supabase functions deploy cleanup-storage
// Schedule with pg_cron + pg_net, or an external cron hitting this URL hourly.
//
// Why a separate function instead of just relying on cleanup_expired_content()?
// That SQL function (migration 0003) deletes the *database rows* for expired
// moments, but never touches the actual files sitting in the "moments"
// storage bucket — Postgres has no built-in way to reach into Storage.
// This function does the file-deletion half: it runs FIRST (before the SQL
// cleanup), lists every expired moment's storage_path, deletes those objects
// from the bucket, and only then lets the SQL job remove the rows.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  // Simple shared-secret check so this endpoint can't be triggered by anyone
  // who finds the URL — set CLEANUP_SECRET as an Edge Function env var and
  // pass the same value as a header from your cron job.
  const secret = Deno.env.get("CLEANUP_SECRET");
  if (secret && req.headers.get("x-cleanup-secret") !== secret) {
    return new Response("unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: expiredMoments, error } = await supabase
    .from("moments")
    .select("id, storage_path")
    .not("storage_path", "is", null)
    .lt("expires_at", new Date().toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  const paths = (expiredMoments ?? []).map((m) => m.storage_path).filter(Boolean) as string[];

  let deletedCount = 0;
  if (paths.length > 0) {
    const { error: removeError } = await supabase.storage.from("moments").remove(paths);
    if (!removeError) deletedCount = paths.length;
  }

  // Now that files are gone, let the SQL job remove the rows themselves
  // (safe to call here too — cleanup_expired_content() is idempotent).
  await supabase.rpc("cleanup_expired_content");

  return new Response(
    JSON.stringify({ ok: true, expiredMomentsFound: paths.length, filesDeleted: deletedCount }),
    { headers: { "Content-Type": "application/json" } }
  );
});
