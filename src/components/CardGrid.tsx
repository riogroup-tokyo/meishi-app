"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, User } from "lucide-react"
import type { BusinessCard } from "@/stores/card-store"
import { cn } from "@/lib/utils"

interface CardGridProps {
  cards: BusinessCard[]
  onCardClick: (card: BusinessCard) => void
  selectedCardId?: string | null
}

export function CardGrid({ cards, onCardClick, selectedCardId }: CardGridProps) {
  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="size-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <User className="size-10 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-1">
          名刺がありません
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          右下の「+」ボタンから最初の名刺を追加しましょう
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card
          key={card.id}
          className={cn(
            "cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 relative group",
            selectedCardId === card.id && "ring-2 ring-primary"
          )}
          onClick={() => onCardClick(card)}
        >
          <CardContent className="relative">
            {card.image_url && (
              <div className="absolute top-0 right-0 size-10 rounded-md bg-muted overflow-hidden">
                <div className="size-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  <Building2 className="size-4 text-primary/40" />
                </div>
              </div>
            )}
            <div className="space-y-2 pr-12">
              {card.company_name && (
                <p className="text-xs font-semibold text-primary truncate">
                  {card.company_name}
                </p>
              )}
              <div>
                <p className="text-base font-semibold text-foreground leading-tight">
                  {card.person_name}
                </p>
                {card.person_name_kana && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {card.person_name_kana}
                  </p>
                )}
              </div>
              {(card.position || card.department) && (
                <p className="text-xs text-muted-foreground truncate">
                  {[card.position, card.department].filter(Boolean).join(" / ")}
                </p>
              )}
            </div>
            {card.tags && card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {card.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: `${tag.color}18`,
                      color: tag.color,
                    }}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
