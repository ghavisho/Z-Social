export default function NotificationsLoading() {
  return (
    <main dir="rtl" className="max-w-xl mx-auto px-4 pb-28 pt-6 animate-pulse">
      <div className="h-7 w-20 bg-y-soft rounded mb-6" />
      <div className="divide-y divide-y-soft">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="w-9 h-9 rounded-full bg-y-soft flex-shrink-0" />
            <div className="flex-1 h-3.5 bg-y-soft rounded" />
            <div className="w-10 h-3 bg-y-soft rounded flex-shrink-0" />
          </div>
        ))}
      </div>
    </main>
  );
}
