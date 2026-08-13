export default function DiscoverLoading() {
  return (
    <main dir="rtl" className="max-w-xl mx-auto px-4 pb-28 pt-6 animate-pulse">
      <div className="h-7 w-16 bg-y-soft rounded mb-2" />
      <div className="h-4 w-52 bg-y-soft rounded mb-6" />

      {[1, 2].map((section) => (
        <div key={section} className="mb-8">
          <div className="h-4 w-40 bg-y-soft rounded mb-3" />
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-36 h-32 rounded-y bg-y-soft flex-shrink-0" />
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
