"use client"

import { CreditCard } from "lucide-react"

interface StatsBarProps {
  totalCount: number
  filteredCount: number
  tags: { name: string; color: string; count: number }[]
}

export function StatsBar({ totalCount, filteredCount, tags }: StatsBarProps) {
  const isFiltering = filteredCount !== totalCount

  return (
    <div className="flex items-center gap-3 px-4 py-2 text-sm text-muted-foreground border-b bg-muted/30">
      <div className="flex items-center gap-1.5">
        <CreditCard className="size-3.5" />
        <span>
          全 <span className="font-medium text-foreground">{totalCount}</span> 枚
        </span>
      </div>

      {isFiltering && (
        <>
          <span className="text-border">|</span>
          <span>
            <span className="font-medium text-foreground">{filteredCount}</span> 枚表示中
          </span>
        </>
      )}

      {tags.length > 0 && (
        <>
          <span className="text-border">|</span>
          <div className="flex items-center gap-2 overflow-x-auto">
            {tags.map((tag) => (
              <div key={tag.name} className="flex items-center gap-1 shrink-0">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-xs">
                  {tag.name}
                  <span className="ml-0.5 text-muted-foreground">({tag.count})</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
