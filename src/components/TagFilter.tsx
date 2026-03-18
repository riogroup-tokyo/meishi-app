"use client"

import type { Tag } from "@/types/database"
import { cn } from "@/lib/utils"

interface TagFilterProps {
  tags: Tag[]
  selectedTagIds: string[]
  onToggleTag: (tagId: string) => void
  cardCountByTag: Record<string, number>
}

export function TagFilter({
  tags,
  selectedTagIds,
  onToggleTag,
  cardCountByTag,
}: TagFilterProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          タグ
        </span>
      </div>
      {tags.length === 0 && (
        <p className="text-xs text-muted-foreground px-1 py-2">
          タグがありません
        </p>
      )}
      {tags.map((tag) => {
        const isActive = selectedTagIds.includes(tag.id)
        return (
          <button
            key={tag.id}
            onClick={() => onToggleTag(tag.id)}
            className={cn(
              "flex items-center gap-2.5 w-full rounded-md px-2 py-1.5 text-sm transition-colors text-left",
              isActive
                ? "bg-primary/10 text-primary font-medium"
                : "text-foreground/80 hover:bg-muted"
            )}
          >
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: tag.color }}
            />
            <span className="truncate flex-1">{tag.name}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {cardCountByTag[tag.id] ?? 0}
            </span>
          </button>
        )
      })}
    </div>
  )
}
