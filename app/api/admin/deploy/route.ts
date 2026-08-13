import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { pushFullReplacement } from "@/lib/deploy/github";

export const runtime = "nodejs";
export const maxDuration = 60; // pushing the commit, not the host's build itself

const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50MB — plenty for source-only (no node_modules)
const MAX_FILES = 2000;

// Never push these even if they're in the zip — either build artifacts
// the host regenerates itself, or files that could leak secrets.
const EXCLUDED_PREFIXES = ["node_modules/", ".git/", ".next/", "out/", "dist/"];
const EXCLUDED_EXACT = [".env", ".env.local"];

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "وارد نشده‌ای." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role, username").eq("id", user.id).maybeSingle();
  // Deliberately super_admin only: this endpoint can push arbitrary code to
  // the repo that your host auto-deploys from. It is at least as powerful
  // as maintenance mode, if not more so — a compromised regular-admin
  // account must not be able to reach it.
  if (!profile || profile.role !== "super_admin") {
    return NextResponse.json({ error: "فقط مدیر اصلی می‌تواند اینجا آپلود کند." }, { status: 403 });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !owner || !repo) {
    return NextResponse.json(
      {
        error:
          "این قابلیت هنوز تنظیم نشده. باید GITHUB_TOKEN، GITHUB_OWNER، و GITHUB_REPO را در Environment Variables اضافه کنی — راهنما در README.",
      },
      { status: 501 }
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "فایل zip یافت نشد." }, { status: 400 });
  }
  if (file.size > MAX_ZIP_BYTES) {
    return NextResponse.json({ error: "فایل zip خیلی بزرگ است (حداکثر ۵۰ مگابایت)." }, { status: 400 });
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "فایل zip معتبر نیست یا خراب است." }, { status: 400 });
  }

  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  if (entries.length === 0) {
    return NextResponse.json({ error: "فایل zip خالی است." }, { status: 400 });
  }
  if (entries.length > MAX_FILES) {
    return NextResponse.json({ error: `تعداد فایل‌ها بیش از حد مجاز است (حداکثر ${MAX_FILES}).` }, { status: 400 });
  }

  const files: { path: string; data: Buffer }[] = [];
  for (const entry of entries) {
    // Normalize: the zip may have a top-level folder (e.g.
    // "z-social/app/page.tsx") — strip the first path segment so pushed
    // paths start at "app/page.tsx", matching the repo root.
    const parts = entry.name.split("/");
    const relativePath = parts.length > 1 ? parts.slice(1).join("/") : parts[0];
    if (!relativePath) continue;

    // Reject path traversal outright — a malicious zip entry name like
    // "../../etc/passwd" must never be honored.
    if (relativePath.includes("..")) {
      return NextResponse.json({ error: `مسیر فایل نامعتبر: ${entry.name}` }, { status: 400 });
    }
    if (EXCLUDED_PREFIXES.some((p) => relativePath.startsWith(p))) continue;
    if (EXCLUDED_EXACT.includes(relativePath)) continue;

    const data = await entry.async("nodebuffer");
    files.push({ path: relativePath, data });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "بعد از فیلتر کردن، هیچ فایل قابل‌استقراری باقی نماند." }, { status: 400 });
  }

  try {
    const result = await pushFullReplacement(files, { token, owner, repo, branch });

    const admin = createAdminClient();
    await admin.from("admin_logs").insert({
      admin_id: user.id,
      action: "code_deployed_via_zip_upload",
      target_type: "commit",
      target_id: null,
      metadata: { commitSha: result.commitSha, fileCount: files.length, zipName: file.name },
    });

    return NextResponse.json({
      ok: true,
      commitSha: result.commitSha,
      commitUrl: result.commitUrl,
      fileCount: files.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "خطا در ارسال فایل‌ها به GitHub." }, { status: 500 });
  }
}
