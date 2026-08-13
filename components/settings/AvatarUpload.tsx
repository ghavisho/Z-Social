"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Camera } from "lucide-react";

export function AvatarUpload({ userId, currentUrl }: { userId: string; currentUrl: string | null }) {
  const router = useRouter();
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("فقط فایل تصویری قابل قبول است.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("حجم عکس نباید بیشتر از ۵ مگابایت باشد.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      // avatars bucket is public (spec §16: profile pictures need to load
      // without a signed-URL round trip everywhere they're shown), so the
      // path itself is the only access control — one file per user, fixed
      // name, overwritten on every new upload.
      const path = `${userId}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) {
        setError("آپلود ناموفق بود.");
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the new image shows immediately instead of a stale
      // cached version at the same URL.
      const bustedUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: bustedUrl })
        .eq("id", userId);
      if (updateError) {
        setError("عکس آپلود شد ولی ذخیره‌ی پروفایل ناموفق بود.");
        return;
      }

      setPreview(bustedUrl);
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative w-20 h-20 rounded-full overflow-hidden bg-y-lavender flex items-center justify-center group"
      >
        {preview ? (
          <Image src={preview} alt="" fill sizes="80px" className="object-cover" />
        ) : (
          <Camera size={22} className="text-y-deep" />
        )}
        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Camera size={18} className="text-white" />
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      {uploading && <p className="text-xs text-ink-muted">در حال آپلود...</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
