import { supabase } from '@/lib/supabase'
import type {
  BusinessCard,
  BusinessCardInsert,
  BusinessCardUpdate,
  Tag,
  TagInsert,
  TagUpdate,
  CardRelation,
  Profile,
  ProfileUpdate,
  Message,
  CalendarEvent,
  CalendarEventInsert,
  CalendarEventUpdate,
  CustomerConnection,
  Notification,
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
      `person_name.ilike.${pattern},company_name.ilike.${pattern},email.ilike.${pattern},memo.ilike.${pattern},department.ilike.${pattern},position.ilike.${pattern},nickname.ilike.${pattern},app_number.ilike.${pattern},receipt_name.ilike.${pattern}`
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

export async function toggleFavorite(
  cardId: string,
  isFavorite: boolean
): Promise<BusinessCard> {
  const { data, error } = await supabase
    .from('business_cards')
    .update({ is_favorite: isFavorite } as Record<string, unknown>)
    .eq('id', cardId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to toggle favorite: ${error.message}`)
  }

  return data as BusinessCard
}

interface GetGroupCardsOptions {
  search?: string
}

export async function getGroupCards(
  options: GetGroupCardsOptions = {}
): Promise<BusinessCard[]> {
  const { search } = options

  let query = supabase
    .from('business_cards')
    .select('*')

  if (search) {
    const pattern = `%${search}%`
    query = query.or(
      `person_name.ilike.${pattern},company_name.ilike.${pattern},email.ilike.${pattern},memo.ilike.${pattern},department.ilike.${pattern},position.ilike.${pattern},nickname.ilike.${pattern},app_number.ilike.${pattern},receipt_name.ilike.${pattern}`
    )
  }

  query = query.order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch group cards: ${error.message}`)
  }

  return (data ?? []) as BusinessCard[]
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

// ============================================================
// Profiles
// ============================================================

export async function getProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch profile: ${error.message}`)
  }

  return data as Profile
}

export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates as Record<string, unknown>)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update profile: ${error.message}`)
  }

  return data as Profile
}

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('display_name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch profiles: ${error.message}`)
  }

  return (data ?? []) as Profile[]
}

// ============================================================
// Messages
// ============================================================

export async function getMessages(
  limit: number = 50,
  before?: string
): Promise<Message[]> {
  let query = supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch messages: ${error.message}`)
  }

  return (data ?? []) as Message[]
}

export async function sendMessage(
  userId: string,
  content: string
): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ user_id: userId, content } as Record<string, unknown>)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`)
  }

  return data as Message
}

// ============================================================
// Calendar Events
// ============================================================

export async function getCalendarEvents(
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('start_time', startDate)
    .lte('end_time', endDate)
    .order('start_time', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch calendar events: ${error.message}`)
  }

  return (data ?? []) as CalendarEvent[]
}

export async function createCalendarEvent(
  event: CalendarEventInsert
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .insert(event as Record<string, unknown>)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create calendar event: ${error.message}`)
  }

  return data as CalendarEvent
}

export async function updateCalendarEvent(
  id: string,
  updates: CalendarEventUpdate
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('calendar_events')
    .update(updates as Record<string, unknown>)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update calendar event: ${error.message}`)
  }

  return data as CalendarEvent
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete calendar event: ${error.message}`)
  }
}

// ============================================================
// Card Numbers
// ============================================================

export async function getNextCardNumber(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('business_cards')
    .select('card_number')
    .eq('user_id', userId)
    .order('card_number', { ascending: false })
    .limit(1)

  if (error) throw new Error(`Failed to get card number: ${error.message}`)
  const maxNum = (data?.[0] as { card_number: number | null })?.card_number ?? 0
  return maxNum + 1
}

// ============================================================
// Customer Connections (知人関係)
// ============================================================

export async function getCustomerConnections(
  cardId: string
): Promise<(BusinessCard & { connection_id: string; connection_type: string | null; note: string | null })[]> {
  // Get connections where this card is either side
  const { data: connections, error: connError } = await supabase
    .from('customer_connections')
    .select('*')
    .or(`card_id_1.eq.${cardId},card_id_2.eq.${cardId}`)

  if (connError) {
    throw new Error(`Failed to fetch customer connections: ${connError.message}`)
  }

  const conns = (connections ?? []) as CustomerConnection[]
  if (conns.length === 0) {
    return []
  }

  // Build a map of other card ID -> connection metadata
  const connMap = new Map<
    string,
    { connection_id: string; connection_type: string | null; note: string | null }
  >()
  for (const conn of conns) {
    const otherId = conn.card_id_1 === cardId ? conn.card_id_2 : conn.card_id_1
    connMap.set(otherId, {
      connection_id: conn.id,
      connection_type: conn.connection_type,
      note: conn.note,
    })
  }

  const otherIds = Array.from(connMap.keys())

  const { data: cards, error: cardsError } = await supabase
    .from('business_cards')
    .select('*')
    .in('id', otherIds)

  if (cardsError) {
    throw new Error(`Failed to fetch connected cards: ${cardsError.message}`)
  }

  return ((cards ?? []) as BusinessCard[]).map((card) => ({
    ...card,
    connection_id: connMap.get(card.id)!.connection_id,
    connection_type: connMap.get(card.id)!.connection_type,
    note: connMap.get(card.id)!.note,
  }))
}

export async function addCustomerConnection(
  cardId1: string,
  cardId2: string,
  connectionType?: string,
  note?: string
): Promise<void> {
  const { error } = await supabase
    .from('customer_connections')
    .insert({
      card_id_1: cardId1,
      card_id_2: cardId2,
      connection_type: connectionType ?? '知人',
      note: note ?? null,
    } as Record<string, unknown>)

  if (error) {
    if (error.code === '23505') {
      throw new Error('This connection already exists')
    }
    throw new Error(`Failed to add customer connection: ${error.message}`)
  }
}

export async function removeCustomerConnection(connectionId: string): Promise<void> {
  const { error } = await supabase
    .from('customer_connections')
    .delete()
    .eq('id', connectionId)

  if (error) {
    throw new Error(`Failed to remove customer connection: ${error.message}`)
  }
}

// ============================================================
// Admin Functions
// ============================================================

export async function adminDeleteCard(cardId: string): Promise<void> {
  const { error } = await supabase
    .from('business_cards')
    .delete()
    .eq('id', cardId)

  if (error) {
    throw new Error(`Failed to delete card (admin): ${error.message}`)
  }
}

export async function adminDeleteProfile(profileId: string): Promise<void> {
  // Delete the profile; cascading foreign keys will remove related data.
  // Note: Deleting the auth user requires a service-role client, so for now
  // we only delete the profile row (RLS ensures admin-only access).
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', profileId)

  if (error) {
    throw new Error(`Failed to delete profile (admin): ${error.message}`)
  }
}

export async function setAdminStatus(profileId: string, isAdmin: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_admin: isAdmin } as Record<string, unknown>)
    .eq('id', profileId)

  if (error) {
    throw new Error(`Failed to update admin status: ${error.message}`)
  }
}

// ============================================================
// Visit Tracking
// ============================================================

// Record visit (update last_visit_date to today)
export async function recordVisit(cardId: string): Promise<BusinessCard> {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('business_cards')
    .update({ last_visit_date: today } as Record<string, unknown>)
    .eq('id', cardId)
    .select()
    .single()
  if (error) throw new Error(`Failed to record visit: ${error.message}`)
  return data as BusinessCard
}

// ============================================================
// Notifications
// ============================================================

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw new Error(`Failed to fetch notifications: ${error.message}`)
  return (data ?? []) as Notification[]
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw new Error(`Failed to count notifications: ${error.message}`)
  return count ?? 0
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
  if (error) throw new Error(`Failed to mark notification read: ${error.message}`)
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw new Error(`Failed to mark all read: ${error.message}`)
}

// Generate notifications for birthdays (tomorrow) and no-visit (30+ days)
export async function generateNotifications(userId: string): Promise<void> {
  // Get tomorrow's date for birthday check
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowMonth = tomorrow.getMonth() + 1
  const tomorrowDay = tomorrow.getDate()

  // Get all user's cards
  const { data: cards, error } = await supabase
    .from('business_cards')
    .select('*')
    .eq('user_id', userId)
  if (error || !cards) return

  const allCards = cards as BusinessCard[]
  const today = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const todayStr = today.toISOString().split('T')[0]

  for (const card of allCards) {
    // Birthday notification: birthday is tomorrow
    if (card.birthday) {
      const bday = new Date(card.birthday)
      if (bday.getMonth() + 1 === tomorrowMonth && bday.getDate() === tomorrowDay) {
        // Check if already notified today
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('card_id', card.id)
          .eq('type', 'birthday')
          .gte('created_at', todayStr)
          .limit(1)

        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert({
            user_id: userId,
            card_id: card.id,
            type: 'birthday',
            title: '明日は誕生日です',
            message: `${card.person_name}さんの誕生日が明日です`,
          })
        }
      }
    }

    // No-visit notification: last visit > 30 days ago
    if (card.last_visit_date) {
      const lastVisit = new Date(card.last_visit_date)
      if (lastVisit < thirtyDaysAgo) {
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('card_id', card.id)
          .eq('type', 'no_visit')
          .gte('created_at', todayStr)
          .limit(1)

        if (!existing || existing.length === 0) {
          const daysSince = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
          await supabase.from('notifications').insert({
            user_id: userId,
            card_id: card.id,
            type: 'no_visit',
            title: '来店がありません',
            message: `${card.person_name}さんの最終来店から${daysSince}日経過しています`,
          })
        }
      }
    }
  }
}
