"use client"

import { useEffect, useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Grid3X3, List, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useCardStore } from "@/stores/card-store"
import type { BusinessCard } from "@/stores/card-store"
import type { Tag } from "@/types/database"
import { useAuth } from "@/components/AuthProvider"
import { Header } from "@/components/Header"
import { SearchBar } from "@/components/SearchBar"
import { TagFilter } from "@/components/TagFilter"
import { CardGrid } from "@/components/CardGrid"
import { CardList } from "@/components/CardList"
import CardForm, { type CardFormData } from "@/components/CardForm"
import CardDetail from "@/components/CardDetail"
import TagManager from "@/components/TagManager"
import DeleteConfirm from "@/components/DeleteConfirm"
import {
  getCards,
  getCard,
  createCard,
  updateCard,
  deleteCard,
  getTags,
  createTag,
  updateTag,
  deleteTag,
  addTagToCard,
  removeTagFromCard,
  getCardTagsForCards,
  getRelatedCards,
} from "@/lib/actions"
import { uploadCardImage } from "@/lib/image-utils"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading: authLoading, isAuthenticated, signOut } = useAuth()

  const {
    cards,
    tags,
    selectedCardId,
    searchQuery,
    selectedTagIds,
    viewMode,
    isLoading,
    setCards,
    setTags,
    setSelectedCardId,
    setSearchQuery,
    setViewMode,
    setIsLoading,
    toggleTagFilter,
  } = useCardStore()

  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Dialog states
  const [cardFormOpen, setCardFormOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<BusinessCard | null>(null)
  const [editingCardTagIds, setEditingCardTagIds] = useState<string[]>([])
  const [cardDetailOpen, setCardDetailOpen] = useState(false)
  const [detailCard, setDetailCard] = useState<
    (BusinessCard & { tags?: Tag[]; relations?: { id: string; related_card_id: string; relation_type: string | null }[] }) | null
  >(null)
  const [detailTags, setDetailTags] = useState<Tag[]>([])
  const [detailRelatedCards, setDetailRelatedCards] = useState<
    { card: BusinessCard; relationId: string; relationType: string | null }[]
  >([])
  const [tagManagerOpen, setTagManagerOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [cardToDelete, setCardToDelete] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Tag count per card (for sidebar)
  const [cardTagMap, setCardTagMap] = useState<Map<string, string[]>>(new Map())

  // Auth guard: redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [authLoading, isAuthenticated, router])

  // ---- Data fetching ----

  const fetchTags = useCallback(async () => {
    if (!user) return
    try {
      const fetchedTags = await getTags(user.id)
      setTags(fetchedTags)
    } catch (err) {
      console.error("Failed to fetch tags:", err)
      toast.error("タグの取得に失敗しました")
    }
  }, [user, setTags])

  const fetchCards = useCallback(async () => {
    if (!user) return
    setIsLoading(true)
    try {
      const fetchedCards = await getCards(user.id, {
        search: searchQuery || undefined,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      })

      // Get card-tag associations for all fetched cards
      const cardIds = fetchedCards.map((c) => c.id)
      const cardTags = await getCardTagsForCards(cardIds)

      // Build map: cardId -> tagIds
      const tagMap = new Map<string, string[]>()
      for (const ct of cardTags) {
        const existing = tagMap.get(ct.card_id) ?? []
        existing.push(ct.tag_id)
        tagMap.set(ct.card_id, existing)
      }
      setCardTagMap(tagMap)

      // Enrich cards with tags from the store
      const currentTags = useCardStore.getState().tags
      const tagLookup = new Map(currentTags.map((t) => [t.id, t]))
      const enrichedCards: BusinessCard[] = fetchedCards.map((card) => {
        const tIds = tagMap.get(card.id) ?? []
        return {
          ...card,
          tags: tIds.map((id) => tagLookup.get(id)).filter(Boolean) as Tag[],
        }
      })

      setCards(enrichedCards)
    } catch (err) {
      console.error("Failed to fetch cards:", err)
      toast.error("名刺の取得に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }, [user, searchQuery, selectedTagIds, setCards, setIsLoading])

  // Initial load: fetch tags first, then cards will follow via the tags effect
  useEffect(() => {
    if (!user) return
    fetchTags()
  }, [user, fetchTags])

  // Fetch cards when tags are loaded or search/filter changes
  useEffect(() => {
    if (!user || tags.length === 0 && !searchQuery && selectedTagIds.length === 0) {
      // Still fetch even if no tags exist (user may have no tags yet)
      if (user) fetchCards()
      return
    }
    fetchCards()
  }, [user, searchQuery, selectedTagIds, tags, fetchCards])

  // Compute card count by tag
  const cardCountByTag = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const [, tagIds] of cardTagMap) {
      for (const tagId of tagIds) {
        counts[tagId] = (counts[tagId] ?? 0) + 1
      }
    }
    return counts
  }, [cardTagMap])

  // Tags with counts for TagManager
  const tagsWithCounts = useMemo(() => {
    return tags.map((tag) => ({
      ...tag,
      cardCount: cardCountByTag[tag.id] ?? 0,
    }))
  }, [tags, cardCountByTag])

  // ---- Logout ----

  const handleLogout = async () => {
    try {
      await signOut()
      toast.success("ログアウトしました")
      router.push("/login")
    } catch {
      toast.error("ログアウトに失敗しました")
    }
  }

  // ---- Card actions ----

  const handleAddCard = useCallback(() => {
    setEditingCard(null)
    setEditingCardTagIds([])
    setCardFormOpen(true)
  }, [])

  const handleCardClick = useCallback(
    async (card: BusinessCard) => {
      setSelectedCardId(card.id)
      try {
        const fullCard = await getCard(card.id)
        setDetailCard(fullCard)
        setDetailTags(fullCard.tags ?? [])

        // Fetch related cards
        const related = await getRelatedCards(card.id)
        setDetailRelatedCards(
          related.map((r) => ({
            card: r,
            relationId: r.relation_id,
            relationType: r.relation_type,
          }))
        )

        setCardDetailOpen(true)
      } catch (err) {
        console.error("Failed to fetch card detail:", err)
        toast.error("名刺詳細の取得に失敗しました")
      }
    },
    [setSelectedCardId]
  )

  const handleSaveCard = useCallback(
    async (data: CardFormData) => {
      if (!user) return
      setSaving(true)
      try {
        let imageUrl = data.image_url

        // If image is a data URL, upload it
        if (imageUrl && imageUrl.startsWith("data:")) {
          const res = await fetch(imageUrl)
          const blob = await res.blob()
          const file = new File([blob], "card.jpg", { type: blob.type })
          imageUrl = await uploadCardImage(file, user.id)
        }

        const cardData = {
          user_id: user.id,
          company_name: data.company_name || null,
          department: data.department || null,
          position: data.position || null,
          person_name: data.person_name,
          person_name_kana: data.person_name_kana || null,
          email: data.email || null,
          phone: data.phone || null,
          mobile_phone: data.mobile_phone || null,
          fax: data.fax || null,
          postal_code: data.postal_code || null,
          address: data.address || null,
          website: data.website || null,
          memo: data.memo || null,
          image_url: imageUrl,
        }

        let savedCard: BusinessCard
        if (editingCard) {
          savedCard = await updateCard(editingCard.id, cardData)

          // Sync tags: remove old, add new
          const existingTagIds = editingCardTagIds
          const newTagIds = data.tagIds
          const toRemove = existingTagIds.filter((id) => !newTagIds.includes(id))
          const toAdd = newTagIds.filter((id) => !existingTagIds.includes(id))
          for (const tagId of toRemove) {
            await removeTagFromCard(savedCard.id, tagId)
          }
          for (const tagId of toAdd) {
            await addTagToCard(savedCard.id, tagId)
          }

          toast.success("名刺を更新しました")
        } else {
          savedCard = await createCard(cardData)

          // Add tags
          for (const tagId of data.tagIds) {
            await addTagToCard(savedCard.id, tagId)
          }

          toast.success("名刺を追加しました")
        }

        setCardFormOpen(false)
        setEditingCard(null)
        await fetchCards()
      } catch (err) {
        console.error("Failed to save card:", err)
        toast.error("名刺の保存に失敗しました")
      } finally {
        setSaving(false)
      }
    },
    [user, editingCard, editingCardTagIds, fetchCards]
  )

  const handleDeleteCard = useCallback(async () => {
    if (!cardToDelete) return
    setDeleteLoading(true)
    try {
      await deleteCard(cardToDelete)
      toast.success("名刺を削除しました")
      setDeleteConfirmOpen(false)
      setCardDetailOpen(false)
      setCardToDelete(null)
      setSelectedCardId(null)
      await fetchCards()
    } catch (err) {
      console.error("Failed to delete card:", err)
      toast.error("名刺の削除に失敗しました")
    } finally {
      setDeleteLoading(false)
    }
  }, [cardToDelete, fetchCards, setSelectedCardId])

  // ---- Detail actions ----

  const handleEditFromDetail = useCallback(() => {
    if (!detailCard) return
    setEditingCard(detailCard)
    setEditingCardTagIds(detailTags.map((t) => t.id))
    setCardDetailOpen(false)
    setCardFormOpen(true)
  }, [detailCard, detailTags])

  const handleDeleteFromDetail = useCallback(() => {
    if (!detailCard) return
    setCardToDelete(detailCard.id)
    setDeleteConfirmOpen(true)
  }, [detailCard])

  const handleDetailAddTag = useCallback(
    async (tagId: string) => {
      if (!detailCard) return
      try {
        await addTagToCard(detailCard.id, tagId)
        const tag = tags.find((t) => t.id === tagId)
        if (tag) {
          setDetailTags((prev) => [...prev, tag])
        }
        await fetchCards()
        toast.success("タグを追加しました")
      } catch (err) {
        console.error("Failed to add tag:", err)
        toast.error("タグの追加に失敗しました")
      }
    },
    [detailCard, tags, fetchCards]
  )

  const handleDetailRemoveTag = useCallback(
    async (tagId: string) => {
      if (!detailCard) return
      try {
        await removeTagFromCard(detailCard.id, tagId)
        setDetailTags((prev) => prev.filter((t) => t.id !== tagId))
        await fetchCards()
        toast.success("タグを削除しました")
      } catch (err) {
        console.error("Failed to remove tag:", err)
        toast.error("タグの削除に失敗しました")
      }
    },
    [detailCard, fetchCards]
  )

  const handleDetailMemoChange = useCallback(
    async (memo: string) => {
      if (!detailCard) return
      try {
        await updateCard(detailCard.id, { memo: memo || null })
        setDetailCard((prev) => (prev ? { ...prev, memo: memo || null } : null))
        await fetchCards()
        toast.success("メモを保存しました")
      } catch (err) {
        console.error("Failed to update memo:", err)
        toast.error("メモの保存に失敗しました")
      }
    },
    [detailCard, fetchCards]
  )

  const handleRelatedCardClick = useCallback(
    async (cardId: string) => {
      setCardDetailOpen(false)
      // Find the card from the store or fetch it
      const card = cards.find((c) => c.id === cardId)
      if (card) {
        handleCardClick(card)
      } else {
        // Card not in current view; fetch it directly
        try {
          const fullCard = await getCard(cardId)
          setDetailCard(fullCard)
          setDetailTags(fullCard.tags ?? [])
          const related = await getRelatedCards(cardId)
          setDetailRelatedCards(
            related.map((r) => ({
              card: r,
              relationId: r.relation_id,
              relationType: r.relation_type,
            }))
          )
          setSelectedCardId(cardId)
          setCardDetailOpen(true)
        } catch (err) {
          console.error("Failed to fetch related card:", err)
          toast.error("関連する名刺の取得に失敗しました")
        }
      }
    },
    [cards, handleCardClick, setSelectedCardId]
  )

  // ---- Tag form create callback (for CardForm) ----

  const handleCreateTagFromForm = useCallback(
    async (name: string): Promise<Tag | null> => {
      if (!user) return null
      try {
        const tag = await createTag({ user_id: user.id, name, color: "#3b82f6" })
        await fetchTags()
        return tag
      } catch (err) {
        console.error("Failed to create tag:", err)
        toast.error("タグの作成に失敗しました")
        return null
      }
    },
    [user, fetchTags]
  )

  // ---- TagManager callbacks ----

  const handleTagCreate = useCallback(
    async (name: string, color: string) => {
      if (!user) return
      try {
        await createTag({ user_id: user.id, name, color })
        await fetchTags()
        toast.success("タグを作成しました")
      } catch (err) {
        console.error("Failed to create tag:", err)
        toast.error("タグの作成に失敗しました")
      }
    },
    [user, fetchTags]
  )

  const handleTagUpdate = useCallback(
    async (tagId: string, updates: { name?: string; color?: string }) => {
      try {
        await updateTag(tagId, updates)
        await fetchTags()
        await fetchCards()
        toast.success("タグを更新しました")
      } catch (err) {
        console.error("Failed to update tag:", err)
        toast.error("タグの更新に失敗しました")
      }
    },
    [fetchTags, fetchCards]
  )

  const handleTagDelete = useCallback(
    async (tagId: string) => {
      try {
        await deleteTag(tagId)
        await fetchTags()
        await fetchCards()
        toast.success("タグを削除しました")
      } catch (err) {
        console.error("Failed to delete tag:", err)
        toast.error("タグの削除に失敗しました")
      }
    },
    [fetchTags, fetchCards]
  )

  // ---- Auth loading / not authenticated ----

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

  // Sidebar content (shared between desktop and mobile sheet)
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Mobile search */}
      <div className="md:hidden px-1 mb-4">
        <SearchBar />
      </div>

      <TagFilter
        tags={tags}
        selectedTagIds={selectedTagIds}
        onToggleTag={toggleTagFilter}
        cardCountByTag={cardCountByTag}
      />

      <Separator className="my-4" />

      {/* View mode toggle (mobile) */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            表示
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="size-4 mr-1.5" />
            グリッド
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => setViewMode("list")}
          >
            <List className="size-4 mr-1.5" />
            リスト
          </Button>
        </div>
      </div>

      <div className="mt-auto pt-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setTagManagerOpen(true)}
        >
          <Plus className="size-4 mr-1.5" />
          タグを管理
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        onMenuClick={() => setSidebarOpen(true)}
        onAddCard={handleAddCard}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 border-r bg-sidebar p-4">
          <ScrollArea className="flex-1">
            {sidebarContent}
          </ScrollArea>
        </aside>

        {/* Mobile sidebar sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-72 p-4">
            <SheetHeader>
              <SheetTitle>メニュー</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto mt-4">
              {sidebarContent}
            </div>
          </SheetContent>
        </Sheet>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            {/* Stats bar */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  {isLoading
                    ? "読み込み中..."
                    : `${cards.length} 件の名刺`}
                </p>
              </div>
            </div>

            {/* Loading state */}
            {isLoading && cards.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
            ) : viewMode === "grid" ? (
              <CardGrid
                cards={cards}
                onCardClick={handleCardClick}
                selectedCardId={selectedCardId}
              />
            ) : (
              <CardList
                cards={cards}
                onCardClick={handleCardClick}
                selectedCardId={selectedCardId}
              />
            )}
          </div>
        </main>
      </div>

      {/* Floating action button (mobile) */}
      <button
        onClick={handleAddCard}
        className="sm:hidden fixed bottom-6 right-6 z-50 size-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all"
      >
        <Plus className="size-6" />
      </button>

      {/* CardForm dialog */}
      <CardForm
        open={cardFormOpen}
        onOpenChange={setCardFormOpen}
        card={editingCard}
        existingTags={tags}
        initialTagIds={editingCardTagIds}
        onSave={handleSaveCard}
        onCreateTag={handleCreateTagFromForm}
        saving={saving}
      />

      {/* CardDetail dialog */}
      <CardDetail
        open={cardDetailOpen}
        onOpenChange={setCardDetailOpen}
        card={detailCard}
        tags={detailTags}
        allTags={tags}
        relatedCards={detailRelatedCards}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
        onAddTag={handleDetailAddTag}
        onRemoveTag={handleDetailRemoveTag}
        onMemoChange={handleDetailMemoChange}
        onRelatedCardClick={handleRelatedCardClick}
      />

      {/* TagManager dialog */}
      <TagManager
        open={tagManagerOpen}
        onOpenChange={setTagManagerOpen}
        tags={tagsWithCounts}
        onCreateTag={handleTagCreate}
        onUpdateTag={handleTagUpdate}
        onDeleteTag={handleTagDelete}
      />

      {/* DeleteConfirm dialog */}
      <DeleteConfirm
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleDeleteCard}
        loading={deleteLoading}
      />
    </div>
  )
}
