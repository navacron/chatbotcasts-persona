export default function GuestsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        {/* Header skeleton */}
        <div className="space-y-6 mb-12">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="h-10 w-40 bg-muted rounded-lg animate-pulse" />
              <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            </div>
          </div>

          {/* Tabs skeleton */}
          <div className="flex gap-2 border-b border-border">
            <div className="h-10 w-32 bg-muted rounded animate-pulse" />
            <div className="h-10 w-24 bg-muted rounded animate-pulse" />
          </div>

          {/* Search skeleton */}
          <div className="h-11 w-full bg-muted rounded-lg animate-pulse" />
        </div>

        {/* Guest grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-lg p-6 space-y-4">
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
              <div className="h-4 w-full bg-muted rounded animate-pulse" />
              <div className="flex gap-2 mt-4">
                <div className="h-9 flex-1 bg-muted rounded animate-pulse" />
                <div className="h-9 flex-1 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
