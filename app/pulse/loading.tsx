export default function PulseLoading() {
  return (
    <main dir="rtl" className="max-w-xl mx-auto px-4 pb-28 pt-6 animate-pulse">
      <div className="h-7 w-20 bg-y-soft rounded mb-2" />
      <div className="h-4 w-48 bg-y-soft rounded mb-6" />

      <div className="flex gap-3 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-28 h-40 rounded-y bg-y-soft flex-shrink-0" />
        ))}
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-y bg-y-soft/60 h-28" />
        ))}
      </div>
    </main>
  );
}
