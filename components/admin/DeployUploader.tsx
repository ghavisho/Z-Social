"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type Phase = "idle" | "uploading" | "building" | "ready" | "unknown" | "error";

export function DeployUploader() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [commitUrl, setCommitUrl] = useState<string | null>(null);
  const [siteUrl, setSiteUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      setError("فقط فایل .zip قابل قبول است.");
      return;
    }

    const confirmed = confirm(
      `فایل «${file.name}» به‌عنوان نسخه‌ی جدید به مخزن GitHub فرستاده می‌شود و سرویس میزبانی‌ات (مثل Netlify) خودکار آن را منتشر می‌کند. کدهای فعلی جایگزین می‌شوند، ولی دیتابیس (اطلاعات کاربران، پست‌ها، پیام‌ها) کاملاً دست‌نخورده باقی می‌ماند — چون کد و دیتابیس دو سیستم کاملاً جدا هستند. مطمئنی؟`
    );
    if (!confirmed) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setError(null);
    setFileName(file.name);
    setPhase("uploading");
    setCommitUrl(null);
    setSiteUrl(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/deploy", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "خطا در آپلود.");
        setPhase("error");
        return;
      }

      setCommitUrl(data.commitUrl ?? null);
      setPhase("building");
      pollStatus();
    } catch {
      setError("ارتباط با سرور برقرار نشد.");
      setPhase("error");
    }
  }

  function pollStatus() {
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const res = await fetch(`/api/admin/deploy/status`);
        const data = await res.json();
        if (!res.ok) return;

        if (data.readyState === "READY") {
          setPhase("ready");
          setSiteUrl(data.url ?? null);
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.readyState === "ERROR") {
          setError("Build با خطا مواجه شد — برای جزئیات، داشبورد Netlify را چک کن.");
          setPhase("error");
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (data.readyState === "UNKNOWN") {
          // Netlify status polling isn't configured — the push itself
          // already succeeded, so stop here instead of spinning forever.
          setPhase("unknown");
          if (pollRef.current) clearInterval(pollRef.current);
        }
        // else "BUILDING" — keep polling.

        if (attempts > 60 && pollRef.current) {
          // ~4 minutes of polling — stop rather than poll forever.
          clearInterval(pollRef.current);
          setPhase("unknown");
        }
      } catch {
        // transient network error while polling — just try again next tick
      }
    }, 4000);
  }

  return (
    <div className="rounded-y border border-y-soft p-4">
      <div className="flex items-center gap-2 mb-2">
        <UploadCloud size={16} className="text-y-royal" />
        <p className="text-sm font-semibold">آپلود نسخه‌ی جدید (ZIP)</p>
      </div>
      <p className="text-xs text-ink-muted mb-3">
        فایل zip کد جدیدی که دریافت کرده‌ای را اینجا آپلود کن. کد مستقیم به مخزن GitHub فرستاده می‌شود و
        سرویس میزبانی‌ات (Netlify یا هرچی وصل کرده‌ای) خودکار Build و منتشرش می‌کند — بدون نیاز به کامپیوتر
        شخصی، و بدون هیچ وقفه یا از‌دست‌رفتن اطلاعات کاربران.
      </p>

      <input ref={inputRef} type="file" accept=".zip" onChange={handleFile} className="hidden" id="deploy-zip-input" />
      <label
        htmlFor="deploy-zip-input"
        className="inline-flex items-center gap-2 rounded-y bg-y-royal text-white px-4 py-2 text-sm font-medium cursor-pointer hover:bg-y-deep transition-colors"
      >
        <UploadCloud size={15} /> انتخاب فایل zip
      </label>

      {fileName && (
        <div className="mt-4 text-sm space-y-2">
          <p className="text-ink-muted">
            فایل: <span className="font-medium text-ink">{fileName}</span>
          </p>

          {phase === "uploading" && (
            <StatusLine icon={<Loader2 size={15} className="animate-spin" />} text="در حال ارسال فایل‌ها به GitHub..." />
          )}
          {phase === "building" && (
            <StatusLine icon={<Loader2 size={15} className="animate-spin" />} text="فایل‌ها فرستاده شد — در حال Build توسط سرویس میزبانی..." />
          )}
          {phase === "ready" && (
            <StatusLine
              icon={<CheckCircle2 size={15} className="text-success" />}
              text={
                <>
                  منتشر شد! ✅{" "}
                  {siteUrl && (
                    <a href={siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`} target="_blank" rel="noreferrer" className="text-y-royal underline">
                      دیدن سایت
                    </a>
                  )}
                </>
              }
            />
          )}
          {phase === "unknown" && (
            <StatusLine
              icon={<CheckCircle2 size={15} className="text-success" />}
              text={
                <>
                  فایل‌ها با موفقیت به GitHub فرستاده شدند ✅ — سرویس میزبانی‌ات (Netlify) خودش Build را شروع
                  می‌کند؛ برای دیدن وضعیت دقیق، داشبورد Netlify را چک کن.{" "}
                  {commitUrl && (
                    <a href={commitUrl} target="_blank" rel="noreferrer" className="text-y-royal underline">
                      دیدن Commit
                    </a>
                  )}
                </>
              }
            />
          )}
          {phase === "error" && <StatusLine icon={<XCircle size={15} className="text-danger" />} text={error ?? "خطایی رخ داد."} />}
        </div>
      )}

      {error && phase === "error" && fileName === null && <p className="text-danger text-xs mt-2">{error}</p>}
    </div>
  );
}

function StatusLine({ icon, text }: { icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {icon}
      <span>{text}</span>
    </div>
  );
}
