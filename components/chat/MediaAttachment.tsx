import Image from "next/image";
import { FileText } from "lucide-react";

/**
 * Renders chat media via the stable /api/media proxy (see
 * app/api/media/[bucket]/[...path]/route.ts) instead of a raw signed URL —
 * this lets next/image cache safely and removes the client-side round trip
 * that used to be needed just to resolve a signed URL before rendering.
 */
export function MediaAttachment({
  bucket,
  path,
  mediaType,
  durationSeconds,
}: {
  bucket: "messages" | "voice" | "posts" | "moments";
  path: string;
  mediaType: string;
  durationSeconds?: number | null;
}) {
  const src = `/api/media/${bucket}/${path}`;

  if (mediaType === "audio") {
    return (
      <div className="flex items-center gap-2">
        <audio controls src={src} className="h-9 max-w-[220px]" />
        {durationSeconds ? (
          <span className="text-[11px] text-ink-muted">{durationSeconds}s</span>
        ) : null}
      </div>
    );
  }
  if (mediaType === "image") {
    return (
      <div className="relative w-48 h-48 rounded-y overflow-hidden">
        <Image src={src} alt="" fill sizes="192px" className="object-cover" />
      </div>
    );
  }
  if (mediaType === "video") {
    return <video controls src={src} className="rounded-y max-w-full max-h-72" />;
  }
  return (
    <a href={src} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-y-royal underline">
      <FileText size={16} /> باز کردن فایل
    </a>
  );
}
