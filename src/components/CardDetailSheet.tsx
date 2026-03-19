"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Phone,
  Smartphone,
  Mail,
  Globe,
  MapPin,
  Edit,
  Trash2,
  Share2,
  Star,
  Plus,
  X,
  Loader2,
  Search,
  Hash,
  Receipt,
  Users,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { BusinessCard, Tag } from "@/types/database"
import {
  getCard,
  getCards,
  getRelatedCards,
  addTagToCard,
  removeTagFromCard,
  updateCard,
  toggleFavorite,
  getCustomerConnections,
  addCustomerConnection,
  removeCustomerConnection,
} from "@/lib/actions"
import { toast } from "sonner"

interface CardDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cardId: string | null
  allTags: Tag[]
  onEdit: (card: BusinessCard) => void
  onDelete: (cardId: string) => void
  onRefresh?: () => void
}

export default function CardDetailSheet({
  open,
  onOpenChange,
  cardId,
  allTags,
  onEdit,
  onDelete,
  onRefresh,
}: CardDetailSheetProps) {
  const [card, setCard] = useState<BusinessCard | null>(null)
  const [cardTags, setCardTags] = useState<Tag[]>([])
  const [relatedCards, setRelatedCards] = useState<BusinessCard[]>([])
  const [loading, setLoading] = useState(false)
  const [memo, setMemo] = useState("")
  const [memoEditing, setMemoEditing] = useState(false)
  const [memoSaving, setMemoSaving] = useState(false)
  const [showTagPicker, setShowTagPicker] = useState(false)

  // Connections (知人)
  const [connections, setConnections] = useState<
    (BusinessCard & { connection_id: string; connection_type: string | null; note: string | null })[]
  >([])
  const [showConnectionSearch, setShowConnectionSearch] = useState(false)
  const [connectionSearchQuery, setConnectionSearchQuery] = useState("")
  const [connectionSearchResults, setConnectionSearchResults] = useState<BusinessCard[]>([])
  const [connectionSearching, setConnectionSearching] = useState(false)

  // Fetch card detail when opened
  useEffect(() => {
    if (!open || !cardId) {
      setCard(null)
      setCardTags([])
      setRelatedCards([])
      setConnections([])
      return
    }

    let cancelled = false
    setLoading(true)

    async function fetchDetail() {
      try {
        const fullCard = await getCard(cardId!)
        if (cancelled) return
        setCard(fullCard)
        setCardTags(fullCard.tags ?? [])
        setMemo(fullCard.memo ?? "")

        const related = await getRelatedCards(cardId!)
        if (cancelled) return
        setRelatedCards(related)

        const conns = await getCustomerConnections(cardId!)
        if (cancelled) return
        setConnections(conns)
      } catch (err) {
        console.error("Failed to fetch card detail:", err)
        toast.error("名刺詳細の取得に失敗しました")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDetail()
    return () => {
      cancelled = true
    }
  }, [open, cardId])

  const handleToggleFavorite = useCallback(async () => {
    if (!card) return
    try {
      const updated = await toggleFavorite(card.id, !card.is_favorite)
      setCard(updated)
      onRefresh?.()
      toast.success(
        updated.is_favorite
          ? "お気に入りに追加しました"
          : "お気に入りを解除しました"
      )
    } catch {
      toast.error("お気に入りの切り替えに失敗しました")
    }
  }, [card, onRefresh])

  const handleSaveMemo = useCallback(async () => {
    if (!card) return
    setMemoSaving(true)
    try {
      await updateCard(card.id, { memo: memo || null })
      setCard((prev) => (prev ? { ...prev, memo: memo || null } : null))
      setMemoEditing(false)
      toast.success("メモを保存しました")
    } catch {
      toast.error("メモの保存に失敗しました")
    } finally {
      setMemoSaving(false)
    }
  }, [card, memo])

  const handleAddTag = useCallback(
    async (tagId: string) => {
      if (!card) return
      try {
        await addTagToCard(card.id, tagId)
        const tag = allTags.find((t) => t.id === tagId)
        if (tag) {
          setCardTags((prev) => [...prev, tag])
        }
        toast.success("タグを追加しました")
      } catch {
        toast.error("タグの追加に失敗しました")
      }
    },
    [card, allTags]
  )

  const handleRemoveTag = useCallback(
    async (tagId: string) => {
      if (!card) return
      try {
        await removeTagFromCard(card.id, tagId)
        setCardTags((prev) => prev.filter((t) => t.id !== tagId))
        toast.success("タグを削除しました")
      } catch {
        toast.error("タグの削除に失敗しました")
      }
    },
    [card]
  )

  const handleShareVCard = useCallback(() => {
    if (!card) return
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${card.person_name}`,
      card.company_name ? `ORG:${card.company_name}` : "",
      card.position ? `TITLE:${card.position}` : "",
      card.email ? `EMAIL:${card.email}` : "",
      card.phone ? `TEL;TYPE=WORK:${card.phone}` : "",
      card.mobile_phone ? `TEL;TYPE=CELL:${card.mobile_phone}` : "",
      card.address ? `ADR;TYPE=WORK:;;${card.address};;;;` : "",
      card.website ? `URL:${card.website}` : "",
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\n")

    const blob = new Blob([lines], { type: "text/vcard" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${card.person_name}.vcf`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("vCardをダウンロードしました")
  }, [card])

  // Connection search
  const handleConnectionSearch = useCallback(
    async (query: string) => {
      setConnectionSearchQuery(query)
      if (!query.trim() || !card) {
        setConnectionSearchResults([])
        return
      }
      setConnectionSearching(true)
      try {
        const results = await getCards(card.user_id, { search: query.trim() })
        // Exclude current card and already-connected cards
        const connectedIds = new Set(connections.map((c) => c.id))
        connectedIds.add(card.id)
        setConnectionSearchResults(results.filter((r) => !connectedIds.has(r.id)))
      } catch {
        toast.error("検索に失敗しました")
      } finally {
        setConnectionSearching(false)
      }
    },
    [card, connections]
  )

  const handleAddConnection = useCallback(
    async (targetCardId: string) => {
      if (!card) return
      try {
        await addCustomerConnection(card.id, targetCardId)
        // Refresh connections
        const conns = await getCustomerConnections(card.id)
        setConnections(conns)
        setShowConnectionSearch(false)
        setConnectionSearchQuery("")
        setConnectionSearchResults([])
        toast.success("知人を追加しました")
      } catch (err) {
        const message = err instanceof Error ? err.message : "不明なエラー"
        if (message.includes("already exists")) {
          toast.error("この知人関係は既に登録されています")
        } else {
          toast.error("知人の追加に失敗しました")
        }
      }
    },
    [card]
  )

  const handleRemoveConnection = useCallback(
    async (connectionId: string) => {
      if (!card) return
      try {
        await removeCustomerConnection(connectionId)
        setConnections((prev) => prev.filter((c) => c.connection_id !== connectionId))
        toast.success("知人を削除しました")
      } catch {
        toast.error("知人の削除に失敗しました")
      }
    },
    [card]
  )

  const availableTags = allTags.filter(
    (t) => !cardTags.some((ct) => ct.id === t.id)
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-2xl p-0"
        showCloseButton={false}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : card ? (
          <ScrollArea className="h-full">
            <div className="pb-safe pb-8">
              {/* Card image */}
              {card.image_url && (
                <div className="px-4 pt-2 pb-3">
                  <img
                    src={card.image_url}
                    alt="名刺画像"
                    className="w-full rounded-lg object-contain max-h-48 bg-muted"
                  />
                </div>
              )}

              {/* Header section */}
              <SheetHeader className="px-4 pb-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {card.card_number != null && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground">
                          #{card.card_number}
                        </span>
                      )}
                      <SheetTitle className="text-xl font-bold">
                        {card.person_name}
                      </SheetTitle>
                    </div>
                    {card.nickname && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {card.nickname}
                      </p>
                    )}
                    {card.person_name_kana && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {card.person_name_kana}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                  >
                    <Star
                      className={cn(
                        "size-5",
                        card.is_favorite
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground"
                      )}
                    />
                  </button>
                </div>
              </SheetHeader>

              {/* Company info */}
              {(card.company_name || card.department || card.position) && (
                <div className="px-4 mt-2">
                  {card.company_name && (
                    <p className="text-sm font-medium text-foreground">
                      {card.company_name}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {[card.department, card.position]
                      .filter(Boolean)
                      .join(" / ")}
                  </p>
                </div>
              )}

              <Separator className="my-4" />

              {/* Contact info */}
              <div className="px-4 space-y-3">
                {card.phone && (
                  <a
                    href={`tel:${card.phone}`}
                    className="flex items-center gap-3 py-1 active:bg-muted/60 rounded-md -mx-2 px-2"
                  >
                    <Phone className="size-4 text-[#b71c1c] flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        電話番号
                      </p>
                      <p className="text-sm text-foreground">{card.phone}</p>
                    </div>
                  </a>
                )}

                {card.mobile_phone && (
                  <a
                    href={`tel:${card.mobile_phone}`}
                    className="flex items-center gap-3 py-1 active:bg-muted/60 rounded-md -mx-2 px-2"
                  >
                    <Smartphone className="size-4 text-[#b71c1c] flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        携帯電話
                      </p>
                      <p className="text-sm text-foreground">
                        {card.mobile_phone}
                      </p>
                    </div>
                  </a>
                )}

                {card.email && (
                  <a
                    href={`mailto:${card.email}`}
                    className="flex items-center gap-3 py-1 active:bg-muted/60 rounded-md -mx-2 px-2"
                  >
                    <Mail className="size-4 text-[#b71c1c] flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        メール
                      </p>
                      <p className="text-sm text-foreground break-all">
                        {card.email}
                      </p>
                    </div>
                  </a>
                )}

                {card.website && (
                  <a
                    href={
                      card.website.startsWith("http")
                        ? card.website
                        : `https://${card.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 py-1 active:bg-muted/60 rounded-md -mx-2 px-2"
                  >
                    <Globe className="size-4 text-[#b71c1c] flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        ウェブサイト
                      </p>
                      <p className="text-sm text-foreground break-all">
                        {card.website}
                      </p>
                    </div>
                  </a>
                )}

                {card.address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(card.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 py-1 active:bg-muted/60 rounded-md -mx-2 px-2"
                  >
                    <MapPin className="size-4 text-[#b71c1c] flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        {card.postal_code ? `〒${card.postal_code}` : "住所"}
                      </p>
                      <p className="text-sm text-foreground">{card.address}</p>
                    </div>
                  </a>
                )}

                {card.app_number && (
                  <div className="flex items-center gap-3 py-1 -mx-2 px-2">
                    <Hash className="size-4 text-[#b71c1c] flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        アプリ番号
                      </p>
                      <p className="text-sm text-foreground">{card.app_number}</p>
                    </div>
                  </div>
                )}

                {card.receipt_name && (
                  <div className="flex items-center gap-3 py-1 -mx-2 px-2">
                    <Receipt className="size-4 text-[#b71c1c] flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">
                        領収書宛名
                      </p>
                      <p className="text-sm text-foreground">{card.receipt_name}</p>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Tags */}
              <div className="px-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    タグ
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowTagPicker(!showTagPicker)}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    <Plus className="size-4 text-muted-foreground" />
                  </button>
                </div>

                {cardTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {cardTags.map((tag) => (
                      <span
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag.id)}
                          className="hover:opacity-70"
                        >
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {showTagPicker && availableTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-muted/50 rounded-lg">
                    {availableTags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleAddTag(tag.id)}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-border hover:bg-muted transition-colors"
                      >
                        <span
                          className="size-2 rounded-full mr-1"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}

                {showTagPicker && availableTags.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    追加できるタグがありません
                  </p>
                )}
              </div>

              <Separator className="my-4" />

              {/* Memo */}
              <div className="px-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    メモ
                  </p>
                  {!memoEditing && (
                    <button
                      type="button"
                      onClick={() => setMemoEditing(true)}
                      className="text-xs text-[#b71c1c] hover:underline"
                    >
                      編集
                    </button>
                  )}
                </div>

                {memoEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      className="w-full min-h-[80px] rounded-lg border border-border bg-background p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#b71c1c]/30 focus:border-[#b71c1c]"
                      placeholder="メモを入力..."
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveMemo}
                        disabled={memoSaving}
                        className="bg-[#b71c1c] hover:bg-[#b71c1c]/90 text-white"
                      >
                        {memoSaving ? (
                          <Loader2 className="size-3 animate-spin mr-1" />
                        ) : null}
                        保存
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMemo(card.memo ?? "")
                          setMemoEditing(false)
                        }}
                      >
                        キャンセル
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap">
                    {card.memo || (
                      <span className="text-muted-foreground">メモなし</span>
                    )}
                  </p>
                )}
              </div>

              {/* Related cards */}
              {relatedCards.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="px-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      関連する名刺
                    </p>
                    <div className="space-y-2">
                      {relatedCards.map((rc) => (
                        <div
                          key={rc.id}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                        >
                          <div className="size-8 rounded-full bg-[#b71c1c]/10 flex items-center justify-center text-[#b71c1c] text-xs font-semibold">
                            {rc.person_name?.charAt(0) ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {rc.person_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {rc.company_name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator className="my-4" />

              {/* Connections (知人) */}
              <div className="px-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    知人
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowConnectionSearch(!showConnectionSearch)}
                    className="p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    <Plus className="size-4 text-muted-foreground" />
                  </button>
                </div>

                {connections.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {connections.map((conn) => (
                      <div
                        key={conn.connection_id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                      >
                        <div className="size-8 rounded-full bg-[#b71c1c]/10 flex items-center justify-center text-[#b71c1c] text-xs font-semibold flex-shrink-0">
                          {conn.person_name?.charAt(0) ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {conn.person_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {conn.company_name}
                          </p>
                        </div>
                        {conn.connection_type && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-[#b71c1c]/10 text-[#b71c1c] flex-shrink-0">
                            {conn.connection_type}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemoveConnection(conn.connection_id)}
                          className="p-1 rounded-full hover:bg-muted transition-colors flex-shrink-0"
                        >
                          <X className="size-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {connections.length === 0 && !showConnectionSearch && (
                  <p className="text-xs text-muted-foreground mb-3">知人なし</p>
                )}

                {/* Connection search panel */}
                {showConnectionSearch && (
                  <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-3 mb-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        value={connectionSearchQuery}
                        onChange={(e) => handleConnectionSearch(e.target.value)}
                        placeholder="名前・会社名で検索..."
                        className="h-9 pl-8"
                        autoFocus
                      />
                    </div>

                    {connectionSearching && (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      </div>
                    )}

                    {!connectionSearching && connectionSearchResults.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {connectionSearchResults.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => handleAddConnection(result.id)}
                            className="flex items-center gap-2 w-full p-2 rounded-md hover:bg-muted active:bg-muted/80 transition-colors text-left"
                          >
                            <div className="size-7 rounded-full bg-[#b71c1c]/10 flex items-center justify-center text-[#b71c1c] text-xs font-semibold flex-shrink-0">
                              {result.person_name?.charAt(0) ?? "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {result.person_name}
                              </p>
                              {result.company_name && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {result.company_name}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!connectionSearching &&
                      connectionSearchQuery.trim() &&
                      connectionSearchResults.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          該当する名刺が見つかりません
                        </p>
                      )}

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowConnectionSearch(false)
                          setConnectionSearchQuery("")
                          setConnectionSearchResults([])
                        }}
                      >
                        閉じる
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              {/* Action buttons */}
              <div className="px-4 pb-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    onEdit(card)
                    onOpenChange(false)
                  }}
                >
                  <Edit className="size-4 mr-1.5" />
                  編集
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleShareVCard}
                >
                  <Share2 className="size-4 mr-1.5" />
                  共有
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-destructive hover:text-destructive"
                  onClick={() => {
                    onDelete(card.id)
                    onOpenChange(false)
                  }}
                >
                  <Trash2 className="size-4 mr-1.5" />
                  削除
                </Button>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">名刺が見つかりません</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
