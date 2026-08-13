export default function SettingsLoading() {
  return (
    <main dir="rtl" className="max-w-xl mx-auto px-4 pb-28 pt-6 animate-pulse">
      <div className="h-7 w-24 bg-y-soft rounded mb-6" />

      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full bg-y-soft" />
        <div className="h-3.5 w-28 bg-y-soft rounded mt-3" />
      </div>

      {[1, 2, 3].map((section) => (
        <div key={section} className="mb-8">
          <div className="h-4 w-24 bg-y-soft rounded mb-3" />
          <div className="h-11 bg-y-soft/60 rounded-y" />
        </div>
      ))}
    </main>
  );
}
