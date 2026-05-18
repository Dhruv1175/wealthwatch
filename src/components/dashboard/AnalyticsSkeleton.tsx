export default function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 mb-8 animate-pulse font-mono">
      <div className="flex justify-between items-center border-b border-white/10 pb-4">
        <div className="h-4 bg-zinc-900 w-1/4 rounded" />
        <div className="h-8 bg-zinc-900 w-1/5 rounded" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border border-white/5 bg-zinc-950 p-4 h-24 flex flex-col justify-between">
            <div className="h-2 bg-zinc-900 w-1/3 rounded" />
            <div className="h-5 bg-zinc-900 w-1/2 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-white/5 bg-zinc-950 p-5 h-72 rounded" />
        <div className="border border-white/5 bg-zinc-950 p-5 h-72 rounded" />
      </div>
    </div>
  );
}