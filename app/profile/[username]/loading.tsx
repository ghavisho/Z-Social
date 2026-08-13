export default function ProfileLoading() {
  return (
    <main dir="rtl" className="max-w-xl mx-auto pb-28 animate-pulse">
      <div className="h-28 bg-y-soft" />
      <div className="px-4 -mt-10">
        <div className="w-20 h-20 rounded-full bg-y-lavender/50 border-4 border-surface-light" />
        <div className="h-5 w-32 bg-y-soft rounded mt-3" />
        <div className="h-3.5 w-20 bg-y-soft rounded mt-2" />
      </div>
      <div className="flex gap-6 px-4 mt-6 border-b border-y-soft pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-3.5 w-14 bg-y-soft rounded" />
        ))}
      </div>
    </main>
  );
}
