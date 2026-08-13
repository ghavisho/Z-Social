export default function MessagesLoading() {
  return (
    <main dir="rtl" className="max-w-xl mx-auto px-4 pb-28 pt-6 animate-pulse">
      <div className="h-7 w-20 bg-y-soft rounded mb-6" />
      <div className="divide-y divide-y-soft">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 py-4">
            <div className="w-11 h-11 rounded-full bg-y-soft flex-shrink-0" />
            <div className="flex-1">
              <div className="h-3.5 w-28 bg-y-soft rounded mb-2" />
              <div className="h-3 w-40 bg-y-soft rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
