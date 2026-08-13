import Link from "next/link";
import Image from "next/image";

type Moment = {
  id: string;
  author_id: string;
  media_type: string;
  text_content: string | null;
  storage_path?: string | null;
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null;
};

export function MomentsRail({ moments }: { moments: Moment[] }) {
  if (moments.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 mb-6 -mx-4 px-4 no-scrollbar">
      {moments.map((m) => {
        // Stable proxy URL (see app/api/media/[bucket]/[...path]/route.ts) —
        // no server-side signed-URL generation needed here anymore.
        const src = m.storage_path ? `/api/media/moments/${m.storage_path}` : null;

        return (
          <Link
            key={m.id}
            href={`/moments/${m.id}`}
            className="relative flex-shrink-0 w-28 h-40 rounded-y overflow-hidden text-white p-3 flex flex-col justify-between shadow-y animate-pulse-in bg-gradient-to-br from-y-royal to-y-deep"
          >
            {src && m.media_type === "image" && (
              <Image src={src} alt="" fill sizes="112px" className="object-cover" />
            )}
            {src && m.media_type === "video" && (
              <video src={src} muted className="absolute inset-0 w-full h-full object-cover" />
            )}
            {src && <div className="absolute inset-0 bg-black/25" />}

            <span className="relative text-xs font-medium truncate">
              {m.profiles?.display_name ?? m.profiles?.username}
            </span>
            {m.media_type === "text" && (
              <p className="relative text-[11px] leading-tight line-clamp-4">{m.text_content}</p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
