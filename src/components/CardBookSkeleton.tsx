"use client"

function SkeletonRow() {
  return (
    <div className="flex items-center w-full gap-3 px-4 py-3 min-h-[56px] animate-pulse">
      {/* Avatar circle */}
      <div className="flex-shrink-0">
        <div className="size-10 rounded-full bg-muted" />
      </div>

      {/* Center content: two lines */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 w-32 rounded bg-muted" />
        <div className="h-3 w-48 rounded bg-muted" />
      </div>

      {/* Right: star icon area */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <div className="size-4 rounded bg-muted" />
        <div className="size-4 rounded bg-muted" />
      </div>
    </div>
  )
}

export default function CardBookSkeleton() {
  return (
    <div>
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  )
}
