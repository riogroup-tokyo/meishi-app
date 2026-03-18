"use client"

import { useState, useCallback } from "react"
import type { BusinessCard } from "@/types/database"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  LinkIcon,
  XIcon,
  UserPlusIcon,
  BuildingIcon,
} from "lucide-react"

// Relation types
const RELATION_TYPES = [
  { value: "colleague", label: "同僚" },
  { value: "boss", label: "上司" },
  { value: "subordinate", label: "部下" },
  { value: "client", label: "取引先" },
  { value: "partner", label: "パートナー" },
  { value: "other", label: "その他" },
] as const

type RelationType = (typeof RELATION_TYPES)[number]["value"]

export interface RelatedCard {
  card: BusinessCard
  relationId: string
  relationType: string | null
}

interface RelationManagerProps {
  cardId: string
  relatedCards: RelatedCard[]
  allCards: BusinessCard[]
  onAddRelation: (relatedCardId: string, relationType: string | null) => void
  onRemoveRelation: (relationId: string) => void
}

function getRelationLabel(type: string | null): string {
  if (!type) return ""
  const found = RELATION_TYPES.find((r) => r.value === type)
  return found ? found.label : type
}

export default function RelationManager({
  cardId,
  relatedCards,
  allCards,
  onAddRelation,
  onRemoveRelation,
}: RelationManagerProps) {
  const [searchValue, setSearchValue] = useState("")
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [relationType, setRelationType] = useState<RelationType | "">("")

  // Filter out the current card and already related cards
  const relatedIds = new Set(relatedCards.map((r) => r.card.id))
  relatedIds.add(cardId)

  const availableCards = allCards.filter((c) => !relatedIds.has(c.id))

  const filteredCards = availableCards.filter((c) => {
    if (!searchValue) return true
    const q = searchValue.toLowerCase()
    return (
      c.person_name.toLowerCase().includes(q) ||
      (c.company_name?.toLowerCase().includes(q) ?? false) ||
      (c.department?.toLowerCase().includes(q) ?? false) ||
      (c.email?.toLowerCase().includes(q) ?? false)
    )
  })

  const handleAdd = useCallback(() => {
    if (!selectedCardId) return
    onAddRelation(selectedCardId, relationType || null)
    setSelectedCardId(null)
    setRelationType("")
    setSearchValue("")
  }, [selectedCardId, relationType, onAddRelation])

  const selectedCard = availableCards.find((c) => c.id === selectedCardId)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <LinkIcon className="size-4" />
        関連する名刺
      </div>

      {/* Existing relations */}
      {relatedCards.length > 0 ? (
        <div className="space-y-2">
          {relatedCards.map((rel) => (
            <div
              key={rel.relationId}
              className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <BuildingIcon className="size-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {rel.card.person_name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[rel.card.company_name, rel.card.position]
                    .filter(Boolean)
                    .join(" / ")}
                </p>
              </div>
              {rel.relationType && (
                <Badge variant="secondary" className="shrink-0">
                  {getRelationLabel(rel.relationType)}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onRemoveRelation(rel.relationId)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <XIcon className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          関連する名刺はありません
        </p>
      )}

      <Separator />

      {/* Add new relation */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground">
          名刺を検索してリンク
        </p>

        {/* Card search */}
        <div className="rounded-lg border">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="名前、会社名で検索..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>候補が見つかりません</CommandEmpty>
              <CommandGroup>
                {filteredCards.slice(0, 8).map((card) => (
                  <CommandItem
                    key={card.id}
                    value={card.id}
                    onSelect={() => setSelectedCardId(card.id)}
                    data-checked={selectedCardId === card.id}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {card.person_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[card.company_name, card.position]
                          .filter(Boolean)
                          .join(" / ")}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>

        {/* Selected card preview */}
        {selectedCard && (
          <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-sm">
            <UserPlusIcon className="size-4 text-primary" />
            <span className="font-medium">{selectedCard.person_name}</span>
            <span className="text-muted-foreground">
              {selectedCard.company_name}
            </span>
          </div>
        )}

        {/* Relation type + add button */}
        <div className="flex items-center gap-2">
          <Select
            value={relationType}
            onValueChange={(val) =>
              setRelationType((val ?? "") as RelationType | "")
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="関係性" />
            </SelectTrigger>
            <SelectContent>
              {RELATION_TYPES.map((rt) => (
                <SelectItem key={rt.value} value={rt.value}>
                  {rt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!selectedCardId}
          >
            <LinkIcon className="size-3.5" />
            リンク追加
          </Button>
        </div>
      </div>
    </div>
  )
}
