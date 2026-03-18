"use client"

import { memo, useCallback } from "react"
import { Star, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { BusinessCard, Tag } from "@/types/database"

interface CardRowProps {
  card: BusinessCard
  tags?: Tag[]
  isFavorite: boolean
  onCardClick: (card: BusinessCard) => void
  onToggleFavorite: (cardId: string, isFavorite: boolean) => void
}

function CardRowInner({
  card,
  tags,
  isFavorite,
  onCardClick,
  onToggleFavorite,
}: CardRowProps) {
  const initial = card.person_name?.charAt(0) ?? "?"

  const handleStarClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onToggleFavorite(card.id, !isFavorite)
    },
    [card.id, isFavorite, onToggleFavorite]
  )

  const handleClick = useCallback(() => {
    onCardClick(card)
  }, [card, onCardClick])

  const subtitle = [card.company_name, card.department, card.position]
    .filter(Boolean)
    .join(" / ")

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center w-full gap-3 px-4 py-3 text-left transition-colors active:bg-muted/60 hover:bg-muted/40 min-h-[56px]"
    >
      {/* Avatar / Initial */}
      <div className="flex-shrink-0">
        {card.image_url ? (
          <div className="size-10 rounded-full overflow-hidden bg-muted">
            <img
              src={card.image_url}
              alt={card.person_name}
              className="size-full object-cover"
            />
          </div>
        ) : (
          <div className="size-10 rounded-full bg-[#b71c1c]/10 flex items-center justify-center text-[#b71c1c] font-semibold text-base">
            {initial}
          </div>
        )}
      </div>

      {/* Center content */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground truncate">
          {card.person_name}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {subtitle}
          </p>
        )}
        {/* Tag dots */}
        {tags && tags.length > 0 && (
          <div className="flex items-center gap-1 mt-1">
            {tags.slice(0, 5).map((tag) => (
              <span
                key={tag.id}
                className="size-2 rounded-full inline-block"
                style={{ backgroundColor: tag.color }}
                title={tag.name}
              />
            ))}
            {tags.length > 5 && (
              <span className="text-[10px] text-muted-foreground">
                +{tags.length - 5}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right: Star + Chevron */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={handleStarClick}
          className="p-1.5 rounded-full transition-colors hover:bg-muted active:bg-muted/80"
          aria-label={isFavorite ? "お気に入り解除" : "お気に入り登録"}
        >
          <Star
            className={cn(
              "size-4 transition-colors",
              isFavorite
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            )}
          />
        </button>
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </button>
  )
}

const CardRow = memo(CardRowInner)
export default CardRow
