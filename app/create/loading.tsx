export default function CreateLoading() {
  return (
    <main dir="rtl" className="min-h-screen bg-surface-light flex flex-col animate-pulse">
      <div className="flex items-center justify-between px-4 py-4 border-b border-y-soft">
        <div className="h-5 w-5 bg-y-soft rounded" />
        <div className="h-4 w-16 bg-y-soft rounded" />
        <div className="h-4 w-12 bg-y-soft rounded" />
      </div>
      <div className="flex gap-2 px-4 py-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-16 h-16 bg-y-soft rounded-y flex-shrink-0" />
        ))}
      </div>
      <div className="px-4">
        <div className="h-32 bg-y-soft/60 rounded-y" />
      </div>
    </main>
  );
}
