export default function Loading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="flex items-center gap-2 text-ink-muted text-sm">
        <span className="w-4 h-4 rounded-full border-2 border-y-lavender border-t-y-royal animate-spin" />
        در حال بارگذاری...
      </div>
    </div>
  );
}
