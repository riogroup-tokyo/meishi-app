"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Link2,
  Clock,
  X,
  Search,
} from "lucide-react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from "date-fns"
import { ja } from "date-fns/locale"
import { useAuth } from "@/components/AuthProvider"
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCards,
  getAllProfiles,
} from "@/lib/actions"
import type {
  CalendarEvent,
  CalendarEventInsert,
  CalendarEventUpdate,
  BusinessCard,
  Profile,
} from "@/types/database"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"]

// Color palette for different users
const USER_COLORS = [
  "#b71c1c", "#1565c0", "#2e7d32", "#e65100",
  "#6a1b9a", "#00838f", "#4e342e", "#ad1457",
]

function getUserColor(userId: string, allUserIds: string[]): string {
  const index = allUserIds.indexOf(userId)
  return USER_COLORS[
    (index >= 0 ? index : Math.abs(hashCode(userId))) % USER_COLORS.length
  ]
}

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return hash
}

export function CalendarPage() {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map())
  const [cards, setCards] = useState<BusinessCard[]>([])
  const [loading, setLoading] = useState(true)

  // Dialog state
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)

  // Form state
  const [formTitle, setFormTitle] = useState("")
  const [formDate, setFormDate] = useState("")
  const [formStartTime, setFormStartTime] = useState("09:00")
  const [formEndTime, setFormEndTime] = useState("10:00")
  const [formDescription, setFormDescription] = useState("")
  const [formCardId, setFormCardId] = useState<string | null>(null)
  const [showCardSearch, setShowCardSearch] = useState(false)
  const [cardSearchQuery, setCardSearchQuery] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // All unique user IDs for color assignment
  const allUserIds = useMemo(() => {
    const ids = new Set<string>()
    events.forEach((e) => ids.add(e.user_id))
    return Array.from(ids).sort()
  }, [events])

  // Cards map for quick lookup
  const cardsMap = useMemo(() => {
    const m = new Map<string, BusinessCard>()
    cards.forEach((c) => m.set(c.id, c))
    return m
  }, [cards])

  // Filtered cards for search
  const filteredCards = useMemo(() => {
    if (!cardSearchQuery.trim()) return cards
    const q = cardSearchQuery.toLowerCase()
    return cards.filter(
      (c) =>
        c.person_name.toLowerCase().includes(q) ||
        (c.company_name && c.company_name.toLowerCase().includes(q))
    )
  }, [cards, cardSearchQuery])

  // Calendar grid days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [currentMonth])

  // Events grouped by date key
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    events.forEach((event) => {
      const key = format(parseISO(event.start_time), "yyyy-MM-dd")
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    })
    return map
  }, [events])

  // Events for selected date
  const selectedDateEvents = useMemo(() => {
    const key = format(selectedDate, "yyyy-MM-dd")
    return (eventsByDate.get(key) ?? []).sort(
      (a, b) => a.start_time.localeCompare(b.start_time)
    )
  }, [selectedDate, eventsByDate])

  // Load profiles on mount
  useEffect(() => {
    getAllProfiles()
      .then((profs) => {
        const map = new Map<string, Profile>()
        profs.forEach((p) => map.set(p.id, p))
        setProfiles(map)
      })
      .catch(console.error)
  }, [])

  // Load cards for current user
  useEffect(() => {
    if (!user) return
    getCards(user.id).then(setCards).catch(console.error)
  }, [user])

  // Fetch events when month changes
  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const start = startOfMonth(currentMonth)
      const end = endOfMonth(currentMonth)
      const data = await getCalendarEvents(
        start.toISOString(),
        end.toISOString()
      )
      setEvents(data)
    } catch (err) {
      console.error("Failed to fetch events:", err)
    } finally {
      setLoading(false)
    }
  }, [currentMonth])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // Navigation
  const goToPrevMonth = () => setCurrentMonth((m) => subMonths(m, 1))
  const goToNextMonth = () => setCurrentMonth((m) => addMonths(m, 1))

  // Open new event dialog
  const openNewEvent = () => {
    setEditingEvent(null)
    setFormTitle("")
    setFormDate(format(selectedDate, "yyyy-MM-dd"))
    setFormStartTime("09:00")
    setFormEndTime("10:00")
    setFormDescription("")
    setFormCardId(null)
    setShowCardSearch(false)
    setCardSearchQuery("")
    setShowEventDialog(true)
  }

  // Open edit event dialog
  const openEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event)
    setFormTitle(event.title)
    setFormDate(format(parseISO(event.start_time), "yyyy-MM-dd"))
    setFormStartTime(format(parseISO(event.start_time), "HH:mm"))
    setFormEndTime(format(parseISO(event.end_time), "HH:mm"))
    setFormDescription(event.description ?? "")
    setFormCardId(event.card_id)
    setShowCardSearch(false)
    setCardSearchQuery("")
    setShowDetailDialog(false)
    setShowEventDialog(true)
  }

  // Save event
  const handleSave = async () => {
    if (!user || !formTitle.trim() || saving) return

    setSaving(true)
    try {
      const startTime = new Date(`${formDate}T${formStartTime}:00`).toISOString()
      const endTime = new Date(`${formDate}T${formEndTime}:00`).toISOString()

      if (editingEvent) {
        const updates: CalendarEventUpdate = {
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          start_time: startTime,
          end_time: endTime,
          card_id: formCardId,
        }
        await updateCalendarEvent(editingEvent.id, updates)
      } else {
        const newEvent: CalendarEventInsert = {
          user_id: user.id,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          start_time: startTime,
          end_time: endTime,
          card_id: formCardId,
        }
        await createCalendarEvent(newEvent)
      }

      setShowEventDialog(false)
      await fetchEvents()
    } catch (err) {
      console.error("Failed to save event:", err)
    } finally {
      setSaving(false)
    }
  }

  // Delete event
  const handleDelete = async () => {
    if (!selectedEvent || deleting) return

    setDeleting(true)
    try {
      await deleteCalendarEvent(selectedEvent.id)
      setShowDetailDialog(false)
      setSelectedEvent(null)
      await fetchEvents()
    } catch (err) {
      console.error("Failed to delete event:", err)
    } finally {
      setDeleting(false)
    }
  }

  // Open event detail
  const openEventDetail = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setShowDetailDialog(true)
  }

  return (
    <div className="flex flex-col pb-4">
      {/* Month header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={goToPrevMonth}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <ChevronLeft className="size-5 text-gray-600" />
        </button>
        <h2 className="text-base font-bold text-gray-900">
          {format(currentMonth, "yyyy年M月", { locale: ja })}
        </h2>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
        >
          <ChevronRight className="size-5 text-gray-600" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="px-2">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={`text-center text-[11px] font-medium py-1 ${
                i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd")
            const dayEvents = eventsByDate.get(dateKey) ?? []
            const inMonth = isSameMonth(day, currentMonth)
            const selected = isSameDay(day, selectedDate)
            const today = isToday(day)
            const dayOfWeek = day.getDay()

            return (
              <button
                key={dateKey}
                onClick={() => setSelectedDate(day)}
                className={`
                  relative flex flex-col items-center py-1.5 min-h-[44px]
                  transition-colors rounded-lg
                  ${!inMonth ? "opacity-30" : ""}
                `}
              >
                <div
                  className={`
                    size-8 flex items-center justify-center rounded-full text-sm
                    ${
                      selected
                        ? "bg-[#b71c1c] text-white font-bold"
                        : today
                        ? "ring-2 ring-[#b71c1c] text-[#b71c1c] font-bold"
                        : dayOfWeek === 0
                        ? "text-red-500"
                        : dayOfWeek === 6
                        ? "text-blue-500"
                        : "text-gray-700"
                    }
                  `}
                >
                  {format(day, "d")}
                </div>
                {/* Event dots */}
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((ev, idx) => (
                      <div
                        key={idx}
                        className="size-1.5 rounded-full"
                        style={{
                          backgroundColor: getUserColor(ev.user_id, allUserIds),
                        }}
                      />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <Separator className="my-2" />

      {/* Selected date header */}
      <div className="px-4 py-2">
        <h3 className="text-sm font-semibold text-gray-900">
          {format(selectedDate, "M月d日(E)", { locale: ja })}の予定
        </h3>
      </div>

      {/* Event list for selected date */}
      <div className="px-4 flex-1">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="size-6 border-2 border-[#b71c1c] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : selectedDateEvents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">予定はありません</p>
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDateEvents.map((event) => {
              const color = getUserColor(event.user_id, allUserIds)
              const creator = profiles.get(event.user_id)
              const linkedCard = event.card_id
                ? cardsMap.get(event.card_id)
                : null

              return (
                <button
                  key={event.id}
                  onClick={() => openEventDetail(event)}
                  className="w-full text-left bg-white rounded-xl border border-gray-200 p-3 active:bg-gray-50 transition-colors"
                >
                  <div className="flex gap-3">
                    <div
                      className="w-1 rounded-full shrink-0 self-stretch"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {event.title}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className="size-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {format(parseISO(event.start_time), "HH:mm")} -{" "}
                          {format(parseISO(event.end_time), "HH:mm")}
                        </span>
                      </div>
                      {creator && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {creator.display_name}
                        </p>
                      )}
                      {linkedCard && (
                        <div className="flex items-center gap-1 mt-1">
                          <Link2 className="size-3 text-[#b71c1c]" />
                          <span className="text-xs text-[#b71c1c]">
                            {linkedCard.person_name}
                            {linkedCard.company_name &&
                              ` (${linkedCard.company_name})`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating add button */}
      <button
        onClick={openNewEvent}
        className="fixed bottom-20 right-4 z-40 size-14 rounded-full bg-[#b71c1c] text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform hover:shadow-xl"
      >
        <Plus className="size-6" />
      </button>

      {/* Add/Edit event dialog */}
      <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? "予定を編集" : "予定を追加"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <Label htmlFor="event-title">タイトル *</Label>
              <Input
                id="event-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="例: 打ち合わせ"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="event-date">日付</Label>
              <Input
                id="event-date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="event-start">開始時刻</Label>
                <Input
                  id="event-start"
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="event-end">終了時刻</Label>
                <Input
                  id="event-end"
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="event-desc">メモ</Label>
              <Textarea
                id="event-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="詳細を入力..."
                rows={3}
                className="mt-1 resize-none"
              />
            </div>

            {/* Link business card */}
            <div>
              <Label>名刺を紐付け</Label>
              {formCardId && cardsMap.get(formCardId) ? (
                <div className="mt-1 flex items-center gap-2 bg-red-50 border border-[#b71c1c]/20 rounded-lg px-3 py-2">
                  <Link2 className="size-4 text-[#b71c1c] shrink-0" />
                  <span className="text-sm text-[#b71c1c] flex-1 truncate">
                    {cardsMap.get(formCardId)!.person_name}さんとの打ち合わせ
                  </span>
                  <button
                    onClick={() => setFormCardId(null)}
                    className="p-0.5 rounded-full hover:bg-red-100"
                  >
                    <X className="size-4 text-[#b71c1c]" />
                  </button>
                </div>
              ) : (
                <div className="mt-1">
                  {!showCardSearch ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCardSearch(true)}
                      className="w-full justify-start text-gray-500"
                    >
                      <Link2 className="size-4 mr-2" />
                      名刺を選択...
                    </Button>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
                        <Input
                          value={cardSearchQuery}
                          onChange={(e) => setCardSearchQuery(e.target.value)}
                          placeholder="名前・会社名で検索"
                          className="pl-9 border-0 border-b rounded-none focus-visible:ring-0"
                          autoFocus
                        />
                      </div>
                      <ScrollArea className="max-h-40">
                        {filteredCards.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-3">
                            名刺が見つかりません
                          </p>
                        ) : (
                          filteredCards.map((card) => (
                            <button
                              key={card.id}
                              onClick={() => {
                                setFormCardId(card.id)
                                setShowCardSearch(false)
                                setCardSearchQuery("")
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b last:border-b-0"
                            >
                              <p className="text-sm font-medium text-gray-900">
                                {card.person_name}
                              </p>
                              {card.company_name && (
                                <p className="text-xs text-gray-500">
                                  {card.company_name}
                                </p>
                              )}
                            </button>
                          ))
                        )}
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEventDialog(false)}
              >
                キャンセル
              </Button>
              <Button
                className="flex-1 bg-[#b71c1c] hover:bg-[#9a1515] text-white"
                onClick={handleSave}
                disabled={!formTitle.trim() || saving}
              >
                {saving ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Event detail dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl">
          {selectedEvent && (() => {
            const creator = profiles.get(selectedEvent.user_id)
            const linkedCard = selectedEvent.card_id
              ? cardsMap.get(selectedEvent.card_id)
              : null
            const isOwner = selectedEvent.user_id === user?.id

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="text-left">
                    {selectedEvent.title}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-3 mt-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="size-4 shrink-0" />
                    <span>
                      {format(parseISO(selectedEvent.start_time), "yyyy年M月d日(E) HH:mm", { locale: ja })}
                      {" - "}
                      {format(parseISO(selectedEvent.end_time), "HH:mm")}
                    </span>
                  </div>

                  {creator && (
                    <div className="text-sm text-gray-500">
                      作成者: {creator.display_name}
                    </div>
                  )}

                  {selectedEvent.description && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {selectedEvent.description}
                      </p>
                    </div>
                  )}

                  {linkedCard && (
                    <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2">
                      <Link2 className="size-4 text-[#b71c1c] shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-[#b71c1c]">
                          {linkedCard.person_name}
                        </p>
                        {linkedCard.company_name && (
                          <p className="text-xs text-[#b71c1c]/70">
                            {linkedCard.company_name}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {isOwner && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => openEditEvent(selectedEvent)}
                      >
                        <Pencil className="size-4 mr-1.5" />
                        編集
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        <Trash2 className="size-4 mr-1.5" />
                        {deleting ? "削除中..." : "削除"}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
