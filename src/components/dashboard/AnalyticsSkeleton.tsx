export default function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-3 w-28 rounded" />
          <div className="skeleton h-6 w-44 rounded" />
        </div>
        <div className="skeleton h-9 w-36 rounded-xl" />
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-2 skeleton rounded-2xl h-40" />
        <div className="skeleton rounded-2xl h-40" />
        <div className="skeleton rounded-2xl h-40" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 lg:col-span-8 skeleton rounded-2xl h-72" />
        <div className="col-span-12 lg:col-span-4 skeleton rounded-2xl h-72" />
      </div>
    </div>
  );
}