"use client"

import { User, Mail, Phone } from "lucide-react"
import type { BusinessCard } from "@/stores/card-store"
import { cn } from "@/lib/utils"

interface CardListProps {
  cards: BusinessCard[]
  onCardClick: (card: BusinessCard) => void
  selectedCardId?: string | null
}

export function CardList({ cards, onCardClick, selectedCardId }: CardListProps) {
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
    <div className="rounded-xl border bg-card overflow-hidden">
      {/* Header */}
      <div className="hidden sm:grid grid-cols-[1fr_1fr_0.8fr_1fr_0.5fr] gap-3 px-4 py-2.5 text-xs font-medium text-muted-foreground bg-muted/50 border-b">
        <span>氏名</span>
        <span>会社名</span>
        <span>役職</span>
        <span>連絡先</span>
        <span>タグ</span>
      </div>
      {/* Rows */}
      <div className="divide-y">
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={() => onCardClick(card)}
            className={cn(
              "grid grid-cols-1 sm:grid-cols-[1fr_1fr_0.8fr_1fr_0.5fr] gap-1 sm:gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/50",
              selectedCardId === card.id && "bg-primary/5"
            )}
          >
            {/* Name */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-semibold text-primary">
                  {card.person_name.charAt(0)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{card.person_name}</p>
                {card.person_name_kana && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    {card.person_name_kana}
                  </p>
                )}
              </div>
            </div>

            {/* Company */}
            <div className="flex items-center min-w-0">
              <p className="text-sm text-foreground/80 truncate">
                {card.company_name || "-"}
              </p>
            </div>

            {/* Position */}
            <div className="flex items-center min-w-0">
              <p className="text-sm text-muted-foreground truncate">
                {[card.position, card.department].filter(Boolean).join(" / ") || "-"}
              </p>
            </div>

            {/* Contact */}
            <div className="flex items-center gap-3 min-w-0 text-xs text-muted-foreground">
              {card.email && (
                <span className="flex items-center gap-1 truncate">
                  <Mail className="size-3 shrink-0" />
                  <span className="truncate">{card.email}</span>
                </span>
              )}
              {card.phone && (
                <span className="flex items-center gap-1 truncate">
                  <Phone className="size-3 shrink-0" />
                  <span className="truncate">{card.phone}</span>
                </span>
              )}
              {!card.email && !card.phone && <span>-</span>}
            </div>

            {/* Tags */}
            <div className="flex items-center gap-1 flex-wrap">
              {card.tags?.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-block size-2 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                  title={tag.name}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
