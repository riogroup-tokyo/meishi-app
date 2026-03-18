"use client"

import { useState, useCallback } from "react"
import { format } from "date-fns"
import { ja } from "date-fns/locale"
import type { BusinessCard, Tag } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  BuildingIcon,
  UserIcon,
  PhoneIcon,
  SmartphoneIcon,
  PrinterIcon,
  MailIcon,
  MapPinIcon,
  GlobeIcon,
  TagsIcon,
  PencilIcon,
  TrashIcon,
  ExternalLinkIcon,
  CalendarIcon,
  XIcon,
  PlusIcon,
  ImageIcon,
  ChevronsUpDownIcon,
  StickyNoteIcon,
  LinkIcon,
} from "lucide-react"

interface RelatedCardInfo {
  card: BusinessCard
  relationId: string
  relationType: string | null
}

interface CardDetailProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: BusinessCard | null
  tags: Tag[]
  allTags: Tag[]
  relatedCards: RelatedCardInfo[]
  onEdit: () => void
  onDelete: () => void
  onAddTag: (tagId: string) => void
  onRemoveTag: (tagId: string) => void
  onMemoChange: (memo: string) => void
  onRelatedCardClick?: (cardId: string) => void
}

function formatTimestamp(dateStr: string): string {
  try {
    return format(new Date(dateStr), "yyyy年M月d日 HH:mm", { locale: ja })
  } catch {
    return dateStr
  }
}

function googleMapUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

function getRelationLabel(type: string | null): string {
  const map: Record<string, string> = {
    colleague: "同僚",
    boss: "上司",
    subordinate: "部下",
    client: "取引先",
    partner: "パートナー",
    other: "その他",
  }
  return type ? map[type] ?? type : ""
}

export default function CardDetail({
  open,
  onOpenChange,
  card,
  tags,
  allTags,
  relatedCards,
  onEdit,
  onDelete,
  onAddTag,
  onRemoveTag,
  onMemoChange,
  onRelatedCardClick,
}: CardDetailProps) {
  const [imageEnlarged, setImageEnlarged] = useState(false)
  const [memoValue, setMemoValue] = useState(card?.memo ?? "")
  const [memoEditing, setMemoEditing] = useState(false)
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)

  // Sync memo when card changes
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen && card) {
        setMemoValue(card.memo ?? "")
        setMemoEditing(false)
        setImageEnlarged(false)
      }
      onOpenChange(nextOpen)
    },
    [card, onOpenChange]
  )

  const handleMemoSave = useCallback(() => {
    onMemoChange(memoValue)
    setMemoEditing(false)
  }, [memoValue, onMemoChange])

  if (!card) return null

  const tagIds = new Set(tags.map((t) => t.id))
  const availableTags = allTags.filter((t) => !tagIds.has(t.id))

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="sr-only">名刺詳細</DialogTitle>
            <DialogDescription className="sr-only">
              {card.person_name}の名刺情報
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-6rem)] pr-3">
            <div className="space-y-4">
              {/* Card image */}
              {card.image_url && (
                <div className="space-y-1">
                  <button
                    type="button"
                    className="w-full overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
                    onClick={() => setImageEnlarged(true)}
                  >
                    <img
                      src={card.image_url}
                      alt={`${card.person_name}の名刺`}
                      className="w-full object-contain"
                    />
                  </button>
                  <p className="text-center text-[10px] text-muted-foreground">
                    クリックで拡大
                  </p>
                </div>
              )}

              {/* Company / Department / Position */}
              {(card.company_name || card.department || card.position) && (
                <div className="space-y-1">
                  {card.company_name && (
                    <div className="flex items-center gap-2 text-sm">
                      <BuildingIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="font-medium">{card.company_name}</span>
                    </div>
                  )}
                  {(card.department || card.position) && (
                    <p className="pl-6 text-sm text-muted-foreground">
                      {[card.department, card.position]
                        .filter(Boolean)
                        .join(" / ")}
                    </p>
                  )}
                </div>
              )}

              {/* Name + Kana */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <UserIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="text-lg font-semibold">
                    {card.person_name}
                  </span>
                </div>
                {card.person_name_kana && (
                  <p className="pl-6 text-xs text-muted-foreground">
                    {card.person_name_kana}
                  </p>
                )}
              </div>

              <Separator />

              {/* Contact info */}
              <div className="space-y-2">
                {card.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <PhoneIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">電話:</span>
                    <a
                      href={`tel:${card.phone}`}
                      className="hover:underline"
                    >
                      {card.phone}
                    </a>
                  </div>
                )}
                {card.mobile_phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <SmartphoneIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">携帯:</span>
                    <a
                      href={`tel:${card.mobile_phone}`}
                      className="hover:underline"
                    >
                      {card.mobile_phone}
                    </a>
                  </div>
                )}
                {card.fax && (
                  <div className="flex items-center gap-2 text-sm">
                    <PrinterIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">FAX:</span>
                    <span>{card.fax}</span>
                  </div>
                )}
                {card.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <MailIcon className="size-4 shrink-0 text-muted-foreground" />
                    <a
                      href={`mailto:${card.email}`}
                      className="text-primary hover:underline"
                    >
                      {card.email}
                    </a>
                  </div>
                )}
                {(card.postal_code || card.address) && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div>
                      {card.postal_code && (
                        <span className="text-muted-foreground">
                          〒{card.postal_code}{" "}
                        </span>
                      )}
                      {card.address && (
                        <a
                          href={googleMapUrl(card.address)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          {card.address}
                          <ExternalLinkIcon className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {card.website && (
                  <div className="flex items-center gap-2 text-sm">
                    <GlobeIcon className="size-4 shrink-0 text-muted-foreground" />
                    <a
                      href={
                        card.website.startsWith("http")
                          ? card.website
                          : `https://${card.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 truncate text-primary hover:underline"
                    >
                      {card.website}
                      <ExternalLinkIcon className="size-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>

              <Separator />

              {/* Tags */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <TagsIcon className="size-4 text-muted-foreground" />
                    タグ
                  </div>
                  <Popover
                    open={tagPopoverOpen}
                    onOpenChange={setTagPopoverOpen}
                  >
                    <PopoverTrigger
                      className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <PlusIcon className="size-3" />
                      タグ追加
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-0">
                      <Command>
                        <CommandInput placeholder="タグを検索..." />
                        <CommandList>
                          <CommandEmpty>
                            タグが見つかりません
                          </CommandEmpty>
                          <CommandGroup>
                            {availableTags.map((tag) => (
                              <CommandItem
                                key={tag.id}
                                value={tag.name}
                                onSelect={() => {
                                  onAddTag(tag.id)
                                  setTagPopoverOpen(false)
                                }}
                              >
                                <span
                                  className="inline-block size-2.5 shrink-0 rounded-full"
                                  style={{
                                    backgroundColor: tag.color,
                                  }}
                                />
                                <span className="truncate">{tag.name}</span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="gap-1"
                      >
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                        <button
                          type="button"
                          className="ml-0.5 rounded-full hover:bg-foreground/10"
                          onClick={() => onRemoveTag(tag.id)}
                        >
                          <XIcon className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    タグがありません
                  </p>
                )}
              </div>

              <Separator />

              {/* Memo */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <StickyNoteIcon className="size-4 text-muted-foreground" />
                    メモ
                  </div>
                  {!memoEditing && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setMemoEditing(true)}
                    >
                      <PencilIcon className="size-3" />
                      編集
                    </Button>
                  )}
                </div>
                {memoEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      value={memoValue}
                      onChange={(e) => setMemoValue(e.target.value)}
                      placeholder="メモを入力..."
                      className="min-h-20"
                      autoFocus
                    />
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setMemoValue(card.memo ?? "")
                          setMemoEditing(false)
                        }}
                      >
                        キャンセル
                      </Button>
                      <Button size="xs" onClick={handleMemoSave}>
                        保存
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {card.memo || "メモなし"}
                  </p>
                )}
              </div>

              <Separator />

              {/* Related cards */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <LinkIcon className="size-4 text-muted-foreground" />
                  関連する名刺
                </div>
                {relatedCards.length > 0 ? (
                  <div className="space-y-1.5">
                    {relatedCards.map((rel) => (
                      <button
                        key={rel.relationId}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-lg border bg-muted/30 p-2.5 text-left transition-colors hover:bg-muted/60"
                        onClick={() =>
                          onRelatedCardClick?.(rel.card.id)
                        }
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          <UserIcon className="size-3.5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {rel.card.person_name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[
                              rel.card.company_name,
                              rel.card.position,
                            ]
                              .filter(Boolean)
                              .join(" / ")}
                          </p>
                        </div>
                        {rel.relationType && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            {getRelationLabel(rel.relationType)}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    関連する名刺はありません
                  </p>
                )}
              </div>

              <Separator />

              {/* Timestamps */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="size-3" />
                  作成: {formatTimestamp(card.created_at)}
                </div>
                <div className="flex items-center gap-1">
                  <CalendarIcon className="size-3" />
                  更新: {formatTimestamp(card.updated_at)}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={onEdit}
                >
                  <PencilIcon className="size-3.5" />
                  編集
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1"
                  onClick={onDelete}
                >
                  <TrashIcon className="size-3.5" />
                  削除
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Enlarged image dialog */}
      {card.image_url && (
        <Dialog open={imageEnlarged} onOpenChange={setImageEnlarged}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="sr-only">名刺画像</DialogTitle>
              <DialogDescription className="sr-only">
                {card.person_name}の名刺画像（拡大表示）
              </DialogDescription>
            </DialogHeader>
            <img
              src={card.image_url}
              alt={`${card.person_name}の名刺`}
              className="w-full rounded-md object-contain"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
