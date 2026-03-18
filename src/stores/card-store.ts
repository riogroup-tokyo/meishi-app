import { create } from 'zustand'
import type { BusinessCard as DBBusinessCard, Tag } from '@/types/database'

export type { Tag }

export interface BusinessCardWithRelations extends DBBusinessCard {
  tags?: Tag[]
  relations?: {
    id: string
    related_card_id: string
    relation_type: string | null
  }[]
}

export type BusinessCard = BusinessCardWithRelations

export interface CardStore {
  cards: BusinessCard[]
  tags: Tag[]
  selectedCardId: string | null
  searchQuery: string
  selectedTagIds: string[]
  viewMode: 'grid' | 'list'
  isLoading: boolean

  setCards: (cards: BusinessCard[]) => void
  setTags: (tags: Tag[]) => void
  setSelectedCardId: (id: string | null) => void
  setSearchQuery: (query: string) => void
  toggleTagFilter: (tagId: string) => void
  setViewMode: (mode: 'grid' | 'list') => void
  setIsLoading: (loading: boolean) => void
}

export const useCardStore = create<CardStore>((set) => ({
  cards: [],
  tags: [],
  selectedCardId: null,
  searchQuery: '',
  selectedTagIds: [],
  viewMode: 'grid',
  isLoading: false,

  setCards: (cards) => set({ cards }),
  setTags: (tags) => set({ tags }),
  setSelectedCardId: (id) => set({ selectedCardId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleTagFilter: (tagId) =>
    set((state) => ({
      selectedTagIds: state.selectedTagIds.includes(tagId)
        ? state.selectedTagIds.filter((id) => id !== tagId)
        : [...state.selectedTagIds, tagId],
    })),
  setViewMode: (mode) => set({ viewMode: mode }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}))
