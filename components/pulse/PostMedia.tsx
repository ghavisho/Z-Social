import Image from "next/image";

export function PostMedia({ storagePath, mediaType }: { storagePath: string; mediaType: string }) {
  // /api/media/... is a STABLE url (see app/api/media/[bucket]/[...path]/route.ts)
  // that resolves a fresh signed URL server-side on every hit — this is
  // what makes it safe to use with next/image's caching optimizer, unlike
  // a raw signed URL which expires.
  const src = `/api/media/posts/${storagePath}`;

  if (mediaType === "image") {
    return (
      <div className="relative w-full h-64">
        <Image src={src} alt="" fill sizes="(max-width: 640px) 100vw, 520px" className="object-cover" />
      </div>
    );
  }
  if (mediaType === "video") {
    return <video src={src} controls className="w-full max-h-96" />;
  }
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block text-xs text-y-royal underline p-3">
      دانلود فایل پیوست
    </a>
  );
}
