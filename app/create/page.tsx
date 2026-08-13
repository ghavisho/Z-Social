"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Type, Image as ImageIcon, Video, FileText, Zap, X, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MODES = [
  { key: "text", label: "متن", icon: Type },
  { key: "photo", label: "عکس", icon: ImageIcon },
  { key: "video", label: "ویدیو", icon: Video },
  { key: "file", label: "فایل", icon: FileText },
  { key: "moment", label: "لحظه", icon: Zap },
];

const ACCEPT: Record<string, string> = {
  photo: "image/*",
  video: "video/*",
  file: "application/pdf",
  moment: "image/*,video/*",
};

const MEDIA_TYPE: Record<string, "image" | "video" | "file"> = {
  photo: "image",
  video: "video",
  file: "file",
};

export default function CreatePage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState("text");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickMode(key: string) {
    setMode(key);
    setFile(null);
    if (ACCEPT[key] && key !== "moment") {
      // Defer to next tick so the accept attribute is updated first.
      setTimeout(() => fileInputRef.current?.click(), 0);
    }
  }

  async function handlePost() {
    setError(null);
    if (mode === "moment" && !body.trim() && !file) return;
    if (mode !== "moment" && !body.trim() && !file) return;

    setPosting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("وارد نشده‌ای.");
        return;
      }

      if (mode === "moment") {
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: body.trim() || "(بدون توضیح)", mode }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "خطا در انتشار لحظه.");
          return;
        }

        // Optional photo/video for the moment (spec §15: Moments support
        // Text/Image/Video). Upload to the private "moments" bucket, then
        // attach via update (see the moments UPDATE policy added in 0002).
        if (file && data.momentId) {
          const ext = file.name.split(".").pop();
          const path = `${user.id}/${data.momentId}.${ext}`;
          const { error: uploadError } = await supabase.storage.from("moments").upload(path, file, {
            upsert: true,
          });
          if (!uploadError) {
            await supabase
              .from("moments")
              .update({
                storage_path: path,
                media_type: file.type.startsWith("video") ? "video" : "image",
              })
              .eq("id", data.momentId);
          }
        }

        router.push("/pulse");
        return;
      }

      // 1) Create the post row via the API (runs moderation + RLS).
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body || "(بدون توضیح)", mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "خطا در انتشار.");
        return;
      }

      // 2) If a file was attached, upload it to the user's folder in the
      // "posts" bucket, then link it via post_media (storage RLS requires
      // the path's first segment to equal the user's id — see migration 3).
      if (file && data.postId) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${data.postId}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("posts").upload(path, file, {
          upsert: true,
        });
        if (uploadError) {
          setError("پست منتشر شد ولی آپلود فایل ناموفق بود.");
        } else {
          await supabase.from("post_media").insert({
            post_id: data.postId,
            storage_path: path,
            media_type: MEDIA_TYPE[mode] ?? "file",
          });
        }
      }

      router.push("/pulse");
    } finally {
      setPosting(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-surface-light flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 border-b border-y-soft">
        <button onClick={() => router.back()} className="text-ink-muted">
          <X size={22} />
        </button>
        <h1 className="font-semibold">ایجاد</h1>
        <button
          onClick={handlePost}
          disabled={posting || (!body.trim() && !file)}
          className="text-y-royal font-medium disabled:opacity-40"
        >
          {posting ? "..." : "انتشار"}
        </button>
      </header>

      <div className="flex gap-2 px-4 py-4 overflow-x-auto no-scrollbar">
        {MODES.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => pickMode(key)}
            className={`flex flex-col items-center gap-1 px-4 py-3 rounded-y text-xs flex-shrink-0 transition-colors ${
              mode === key ? "bg-y-royal text-white" : "bg-y-soft text-y-deep"
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT[mode]}
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {file && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-y bg-y-soft/60 px-3 py-2 text-xs text-ink-muted">
          <Paperclip size={14} />
          {file.name}
          <button onClick={() => setFile(null)} className="ms-auto text-danger">
            حذف
          </button>
        </div>
      )}

      {mode === "moment" && !file && (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="mx-4 mb-2 flex items-center gap-2 text-xs text-y-royal"
        >
          <Paperclip size={14} /> افزودن عکس یا ویدیو به این لحظه (اختیاری)
        </button>
      )}

      <div className="flex-1 px-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={mode === "moment" ? "چه لحظه‌ای رو می‌خوای به اشتراک بذاری؟ (۲۴ ساعت بعد پاک می‌شود)" : "چه خبر؟"}
          rows={8}
          className="w-full resize-none outline-none text-base placeholder:text-ink-muted"
          maxLength={2000}
        />
        {error && <p className="text-danger text-sm mt-2">{error}</p>}
      </div>
    </main>
  );
}
