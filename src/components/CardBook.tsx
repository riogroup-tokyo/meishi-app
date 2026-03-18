"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  X,
  Star,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/components/AuthProvider"
import CardRow from "@/components/CardRow"
import CardDetailSheet from "@/components/CardDetailSheet"
import DeleteConfirm from "@/components/DeleteConfirm"
import {
  getCards,
  getGroupCards,
  getTags,
  getCardTagsForCards,
  toggleFavorite,
  deleteCard,
  getAllProfiles,
} from "@/lib/actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { BusinessCard, Tag, Profile } from "@/types/database"

type TabValue = "mine" | "group"

export default function CardBook() {
  const router = useRouter()
  const { user, loading: authLoading, isAuthenticated } = useAuth()

  // Tab state
  const [activeTab, setActiveTab] = useState<TabValue>("mine")

  // Data
  const [myCards, setMyCards] = useState<BusinessCard[]>([])
  const [groupCards, setGroupCards] = useState<BusinessCard[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [cardTagMap, setCardTagMap] = useState<Map<string, Tag[]>>(new Map())
  const [profiles, setProfiles] = useState<Profile[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")

  // Detail sheet
  const [detailCardId, setDetailCardId] = useState<string | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [cardToDelete, setCardToDelete] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Search ref for auto-focus
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Auth guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [searchOpen])

  // Fetch tags
  const fetchTags = useCallback(async () => {
    if (!user) return
    try {
      const fetchedTags = await getTags(user.id)
      setTags(fetchedTags)
    } catch (err) {
      console.error("Failed to fetch tags:", err)
    }
  }, [user])

  // Fetch my cards
  const fetchMyCards = useCallback(async () => {
    if (!user) return
    try {
      const cards = await getCards(user.id, {
        search: debouncedQuery || undefined,
      })

      // Fetch tags for cards
      const cardIds = cards.map((c) => c.id)
      const cardTags = await getCardTagsForCards(cardIds)
      const tagMap = new Map<string, Tag[]>()
      for (const ct of cardTags) {
        const tag = tags.find((t) => t.id === ct.tag_id)
        if (tag) {
          const existing = tagMap.get(ct.card_id) ?? []
          existing.push(tag)
          tagMap.set(ct.card_id, existing)
        }
      }
      setCardTagMap((prev) => {
        const merged = new Map(prev)
        for (const [k, v] of tagMap) {
          merged.set(k, v)
        }
        return merged
      })

      setMyCards(cards)
    } catch (err) {
      console.error("Failed to fetch cards:", err)
      toast.error("名刺の取得に失敗しました")
    }
  }, [user, debouncedQuery, tags])

  // Fetch group cards
  const fetchGroupCards = useCallback(async () => {
    try {
      const cards = await getGroupCards({
        search: debouncedQuery || undefined,
      })

      // Fetch tags for these cards too
      const cardIds = cards.map((c) => c.id)
      const cardTags = await getCardTagsForCards(cardIds)
      const tagMap = new Map<string, Tag[]>()
      for (const ct of cardTags) {
        const tag = tags.find((t) => t.id === ct.tag_id)
        if (tag) {
          const existing = tagMap.get(ct.card_id) ?? []
          existing.push(tag)
          tagMap.set(ct.card_id, existing)
        }
      }
      setCardTagMap((prev) => {
        const merged = new Map(prev)
        for (const [k, v] of tagMap) {
          merged.set(k, v)
        }
        return merged
      })

      setGroupCards(cards)
    } catch (err) {
      console.error("Failed to fetch group cards:", err)
      toast.error("グループ名刺の取得に失敗しました")
    }
  }, [debouncedQuery, tags])

  // Fetch profiles for group tab
  const fetchProfiles = useCallback(async () => {
    try {
      const p = await getAllProfiles()
      setProfiles(p)
    } catch (err) {
      console.error("Failed to fetch profiles:", err)
    }
  }, [])

  // Initial load
  useEffect(() => {
    if (!user) return
    setLoading(true)
    Promise.all([fetchTags(), fetchProfiles()]).finally(() => setLoading(false))
  }, [user, fetchTags, fetchProfiles])

  // Fetch cards when tags loaded or search changes
  useEffect(() => {
    if (!user) return
    setLoading(true)
    if (activeTab === "mine") {
      fetchMyCards().finally(() => setLoading(false))
    } else {
      fetchGroupCards().finally(() => setLoading(false))
    }
  }, [user, activeTab, debouncedQuery, tags, fetchMyCards, fetchGroupCards])

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchTags()
      if (activeTab === "mine") {
        await fetchMyCards()
      } else {
        await fetchGroupCards()
      }
      toast.success("更新しました")
    } catch {
      toast.error("更新に失敗しました")
    } finally {
      setRefreshing(false)
    }
  }, [activeTab, fetchTags, fetchMyCards, fetchGroupCards])

  // Toggle favorite
  const handleToggleFavorite = useCallback(
    async (cardId: string, isFavorite: boolean) => {
      try {
        const updated = await toggleFavorite(cardId, isFavorite)
        setMyCards((prev) =>
          prev.map((c) => (c.id === cardId ? updated : c))
        )
        setGroupCards((prev) =>
          prev.map((c) => (c.id === cardId ? updated : c))
        )
      } catch {
        toast.error("お気に入りの切り替えに失敗しました")
      }
    },
    []
  )

  // Card click
  const handleCardClick = useCallback((card: BusinessCard) => {
    setDetailCardId(card.id)
    setDetailOpen(true)
  }, [])

  // Edit card
  const handleEditCard = useCallback(
    (card: BusinessCard) => {
      router.push(`/register?edit=${card.id}`)
    },
    [router]
  )

  // Delete card
  const handleDeleteCard = useCallback((cardId: string) => {
    setCardToDelete(cardId)
    setDeleteConfirmOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    if (!cardToDelete) return
    setDeleteLoading(true)
    try {
      await deleteCard(cardToDelete)
      setMyCards((prev) => prev.filter((c) => c.id !== cardToDelete))
      setGroupCards((prev) => prev.filter((c) => c.id !== cardToDelete))
      setDeleteConfirmOpen(false)
      setCardToDelete(null)
      toast.success("名刺を削除しました")
    } catch {
      toast.error("名刺の削除に失敗しました")
    } finally {
      setDeleteLoading(false)
    }
  }, [cardToDelete])

  // Separate favorite / non-favorite cards for the 自分 tab
  const favoriteCards = useMemo(
    () => myCards.filter((c) => c.is_favorite),
    [myCards]
  )
  const regularCards = useMemo(
    () => myCards.filter((c) => !c.is_favorite),
    [myCards]
  )

  // Group cards by user_id for the グループ tab
  const groupedByUser = useMemo(() => {
    const grouped = new Map<string, BusinessCard[]>()
    for (const card of groupCards) {
      const existing = grouped.get(card.user_id) ?? []
      existing.push(card)
      grouped.set(card.user_id, existing)
    }
    return grouped
  }, [groupCards])

  const getProfileName = useCallback(
    (userId: string) => {
      const profile = profiles.find((p) => p.id === userId)
      return profile?.display_name ?? "不明なユーザー"
    },
    [profiles]
  )

  // Auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-12">
          <h1 className="text-base font-bold text-foreground">名刺帳</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="検索"
            >
              <Search className="size-5 text-foreground" />
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="更新"
            >
              <RefreshCw
                className={cn(
                  "size-5 text-foreground",
                  refreshing && "animate-spin"
                )}
              />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            type="button"
            onClick={() => setActiveTab("mine")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium text-center transition-colors relative",
              activeTab === "mine"
                ? "text-[#b71c1c]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            自分
            {activeTab === "mine" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b71c1c]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("group")}
            className={cn(
              "flex-1 py-2.5 text-sm font-medium text-center transition-colors relative",
              activeTab === "group"
                ? "text-[#b71c1c]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            グループ
            {activeTab === "group" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b71c1c]" />
            )}
          </button>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="px-4 py-2 border-b bg-background">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="名前、会社名、メールで検索..."
                className="w-full h-9 pl-9 pr-9 text-sm rounded-lg border border-border bg-muted/50 outline-none focus:ring-2 focus:ring-[#b71c1c]/30 focus:border-[#b71c1c] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5"
                >
                  <X className="size-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && myCards.length === 0 && groupCards.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === "mine" ? (
          /* === 自分 tab === */
          <div>
            {myCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="size-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {debouncedQuery
                    ? "検索結果がありません"
                    : "名刺がまだ登録されていません"}
                </p>
                {!debouncedQuery && (
                  <Button
                    size="sm"
                    className="mt-4 bg-[#b71c1c] hover:bg-[#b71c1c]/90 text-white"
                    onClick={() => router.push("/register")}
                  >
                    <Plus className="size-4 mr-1.5" />
                    名刺を登録
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Favorites section */}
                {favoriteCards.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/30">
                      <Star className="size-3.5 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        お気に入り
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({favoriteCards.length})
                      </span>
                    </div>
                    <div>
                      {favoriteCards.map((card) => (
                        <CardRow
                          key={card.id}
                          card={card}
                          tags={cardTagMap.get(card.id)}
                          isFavorite={card.is_favorite}
                          onCardClick={handleCardClick}
                          onToggleFavorite={handleToggleFavorite}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* All cards section */}
                <div>
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/30">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      すべての名刺
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({regularCards.length})
                    </span>
                  </div>
                  <div>
                    {regularCards.map((card) => (
                      <CardRow
                        key={card.id}
                        card={card}
                        tags={cardTagMap.get(card.id)}
                        isFavorite={card.is_favorite}
                        onCardClick={handleCardClick}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* === グループ tab === */
          <div>
            {groupCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Search className="size-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {debouncedQuery
                    ? "検索結果がありません"
                    : "グループの名刺がありません"}
                </p>
              </div>
            ) : (
              Array.from(groupedByUser.entries()).map(([userId, cards]) => (
                <div key={userId}>
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-muted/30">
                    <div className="size-5 rounded-full bg-[#b71c1c]/10 flex items-center justify-center text-[#b71c1c] text-[10px] font-semibold">
                      {getProfileName(userId).charAt(0)}
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {getProfileName(userId)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({cards.length})
                    </span>
                  </div>
                  <div>
                    {cards.map((card) => (
                      <CardRow
                        key={card.id}
                        card={card}
                        tags={cardTagMap.get(card.id)}
                        isFavorite={card.is_favorite}
                        onCardClick={handleCardClick}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* FAB: Add card */}
      <button
        type="button"
        onClick={() => router.push("/register")}
        className="fixed bottom-6 right-6 z-50 size-14 rounded-full bg-[#b71c1c] text-white shadow-lg flex items-center justify-center hover:bg-[#b71c1c]/90 active:scale-95 transition-all"
        aria-label="名刺を登録"
      >
        <Plus className="size-6" />
      </button>

      {/* Card detail sheet */}
      <CardDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        cardId={detailCardId}
        allTags={tags}
        onEdit={handleEditCard}
        onDelete={handleDeleteCard}
        onRefresh={() => {
          if (activeTab === "mine") {
            fetchMyCards()
          } else {
            fetchGroupCards()
          }
        }}
      />

      {/* Delete confirmation */}
      <DeleteConfirm
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleConfirmDelete}
        loading={deleteLoading}
      />
    </div>
  )
}
