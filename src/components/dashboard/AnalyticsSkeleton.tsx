export default function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Control row */}
      <div className="flex justify-between items-center border-b border-border pb-4">
        <div className="h-3 skeleton w-40 rounded" />
        <div className="h-8 skeleton w-36 rounded" />
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="panel p-4 h-24 flex flex-col justify-between">
            <div className="h-2 skeleton w-1/3 rounded" />
            <div className="h-6 skeleton w-1/2 rounded" />
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 panel p-5 h-72 skeleton" />
        <div className="panel p-5 h-72 skeleton" />
      </div>

      {/* Secondary row */}
      <div className="panel p-5 h-32 skeleton" />
    </div>
  );
}