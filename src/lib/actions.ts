import { supabase } from '@/lib/supabase'
import type {
  BusinessCard,
  BusinessCardInsert,
  BusinessCardUpdate,
  Tag,
  TagInsert,
  TagUpdate,
  CardRelation,
} from '@/types/database'

// ============================================================
// Business Cards
// ============================================================

interface GetCardsOptions {
  search?: string
  tagIds?: string[]
  sortBy?: string
  sortOrder?: string
}

export async function getCards(
  userId: string,
  options: GetCardsOptions = {}
): Promise<BusinessCard[]> {
  const {
    search,
    tagIds,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = options

  let query = supabase
    .from('business_cards')
    .select('*')
    .eq('user_id', userId)

  // Fuzzy search across multiple fields using ilike
  if (search) {
    const pattern = `%${search}%`
    query = query.or(
      `person_name.ilike.${pattern},company_name.ilike.${pattern},email.ilike.${pattern},memo.ilike.${pattern},department.ilike.${pattern},position.ilike.${pattern}`
    )
  }

  // Filter by tags: only return cards that have ALL specified tags
  if (tagIds && tagIds.length > 0) {
    const { data: cardTagRows, error: tagError } = await supabase
      .from('card_tags')
      .select('card_id')
      .in('tag_id', tagIds)

    if (tagError) {
      throw new Error(`Failed to filter by tags: ${tagError.message}`)
    }

    const rows = (cardTagRows ?? []) as { card_id: string }[]
    const cardIdCounts = new Map<string, number>()
    for (const row of rows) {
      cardIdCounts.set(row.card_id, (cardIdCounts.get(row.card_id) ?? 0) + 1)
    }
    const matchingCardIds = Array.from(cardIdCounts.entries())
      .filter(([, count]) => count >= tagIds.length)
      .map(([cardId]) => cardId)

    if (matchingCardIds.length === 0) {
      return []
    }

    query = query.in('id', matchingCardIds)
  }

  // Sorting
  const ascending = sortOrder === 'asc'
  query = query.order(sortBy, { ascending })

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch cards: ${error.message}`)
  }

  return (data ?? []) as BusinessCard[]
}

export async function getCard(cardId: string) {
  const { data: card, error: cardError } = await supabase
    .from('business_cards')
    .select('*')
    .eq('id', cardId)
    .single()

  if (cardError) {
    throw new Error(`Failed to fetch card: ${cardError.message}`)
  }

  // Fetch tags linked to this card
  const { data: cardTags, error: tagsError } = await supabase
    .from('card_tags')
    .select('tag_id')
    .eq('card_id', cardId)

  if (tagsError) {
    throw new Error(`Failed to fetch card tags: ${tagsError.message}`)
  }

  let tags: Tag[] = []
  const ctRows = (cardTags ?? []) as { tag_id: string }[]
  if (ctRows.length > 0) {
    const tagIds = ctRows.map((ct) => ct.tag_id)
    const { data: tagData, error: tagFetchError } = await supabase
      .from('tags')
      .select('*')
      .in('id', tagIds)

    if (tagFetchError) {
      throw new Error(`Failed to fetch tags: ${tagFetchError.message}`)
    }
    tags = (tagData ?? []) as Tag[]
  }

  // Fetch relations
  const { data: relations, error: relError } = await supabase
    .from('card_relations')
    .select('*')
    .or(`card_id.eq.${cardId},related_card_id.eq.${cardId}`)

  if (relError) {
    throw new Error(`Failed to fetch relations: ${relError.message}`)
  }

  return {
    ...(card as BusinessCard),
    tags,
    relations: (relations ?? []) as CardRelation[],
  }
}

export async function createCard(
  card: BusinessCardInsert
): Promise<BusinessCard> {
  const { data, error } = await supabase
    .from('business_cards')
    .insert(card as Record<string, unknown>)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create card: ${error.message}`)
  }

  return data as BusinessCard
}

export async function updateCard(
  cardId: string,
  card: BusinessCardUpdate
): Promise<BusinessCard> {
  const { data, error } = await supabase
    .from('business_cards')
    .update(card as Record<string, unknown>)
    .eq('id', cardId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update card: ${error.message}`)
  }

  return data as BusinessCard
}

export async function deleteCard(cardId: string): Promise<void> {
  const { error } = await supabase
    .from('business_cards')
    .delete()
    .eq('id', cardId)

  if (error) {
    throw new Error(`Failed to delete card: ${error.message}`)
  }
}

// ============================================================
// Tags
// ============================================================

export async function getTags(userId: string): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`)
  }

  return (data ?? []) as Tag[]
}

export async function createTag(tag: TagInsert): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .insert(tag as Record<string, unknown>)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create tag: ${error.message}`)
  }

  return data as Tag
}

export async function updateTag(
  tagId: string,
  updates: TagUpdate
): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .update(updates as Record<string, unknown>)
    .eq('id', tagId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update tag: ${error.message}`)
  }

  return data as Tag
}

export async function deleteTag(tagId: string): Promise<void> {
  const { error } = await supabase
    .from('tags')
    .delete()
    .eq('id', tagId)

  if (error) {
    throw new Error(`Failed to delete tag: ${error.message}`)
  }
}

// ============================================================
// Card-Tag linking
// ============================================================

export async function getCardTagsForCards(
  cardIds: string[]
): Promise<{ card_id: string; tag_id: string }[]> {
  if (cardIds.length === 0) return []
  const { data, error } = await supabase
    .from('card_tags')
    .select('card_id, tag_id')
    .in('card_id', cardIds)

  if (error) {
    throw new Error(`Failed to fetch card tags: ${error.message}`)
  }

  return (data ?? []) as { card_id: string; tag_id: string }[]
}

export async function addTagToCard(
  cardId: string,
  tagId: string
): Promise<void> {
  const { error } = await supabase
    .from('card_tags')
    .insert({ card_id: cardId, tag_id: tagId })

  if (error) {
    throw new Error(`Failed to add tag to card: ${error.message}`)
  }
}

export async function removeTagFromCard(
  cardId: string,
  tagId: string
): Promise<void> {
  const { error } = await supabase
    .from('card_tags')
    .delete()
    .eq('card_id', cardId)
    .eq('tag_id', tagId)

  if (error) {
    throw new Error(`Failed to remove tag from card: ${error.message}`)
  }
}

// ============================================================
// Card Relations
// ============================================================

export async function addRelation(
  cardId: string,
  relatedCardId: string,
  relationType?: string
): Promise<CardRelation> {
  const { data, error } = await supabase
    .from('card_relations')
    .insert({
      card_id: cardId,
      related_card_id: relatedCardId,
      relation_type: relationType ?? null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add relation: ${error.message}`)
  }

  return data as CardRelation
}

export async function removeRelation(relationId: string): Promise<void> {
  const { error } = await supabase
    .from('card_relations')
    .delete()
    .eq('id', relationId)

  if (error) {
    throw new Error(`Failed to remove relation: ${error.message}`)
  }
}

export async function getRelatedCards(
  cardId: string
): Promise<(BusinessCard & { relation_id: string; relation_type: string | null })[]> {
  const { data: relations, error: relError } = await supabase
    .from('card_relations')
    .select('*')
    .or(`card_id.eq.${cardId},related_card_id.eq.${cardId}`)

  if (relError) {
    throw new Error(`Failed to fetch relations: ${relError.message}`)
  }

  const rels = (relations ?? []) as CardRelation[]
  if (rels.length === 0) {
    return []
  }

  const relatedMap = new Map<
    string,
    { relation_id: string; relation_type: string | null }
  >()
  for (const rel of rels) {
    const otherId = rel.card_id === cardId ? rel.related_card_id : rel.card_id
    relatedMap.set(otherId, {
      relation_id: rel.id,
      relation_type: rel.relation_type,
    })
  }

  const relatedIds = Array.from(relatedMap.keys())

  const { data: cards, error: cardsError } = await supabase
    .from('business_cards')
    .select('*')
    .in('id', relatedIds)

  if (cardsError) {
    throw new Error(`Failed to fetch related cards: ${cardsError.message}`)
  }

  return ((cards ?? []) as BusinessCard[]).map((card) => ({
    ...card,
    relation_id: relatedMap.get(card.id)!.relation_id,
    relation_type: relatedMap.get(card.id)!.relation_type,
  }))
}
