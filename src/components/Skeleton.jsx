export function StatCardsSkeleton() {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-[76px] flex-1 animate-pulse rounded-lg border border-hairline bg-surface" />
      ))}
    </div>
  )
}

export function BlockSkeleton({ className = 'h-96' }) {
  return <div className={`animate-pulse rounded-lg border border-hairline bg-surface ${className}`} />
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5 h-6 w-48 animate-pulse rounded bg-hairline" />
      <StatCardsSkeleton />
      <BlockSkeleton />
    </div>
  )
}
