"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { SendHorizonal } from "lucide-react"
import { format, isToday, isYesterday } from "date-fns"
import { ja } from "date-fns/locale"
import { useAuth } from "@/components/AuthProvider"
import { supabase } from "@/lib/supabase"
import { getMessages, sendMessage, getAllProfiles } from "@/lib/actions"
import type { Message, Profile } from "@/types/database"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"

function formatMessageTime(dateStr: string): string {
  const date = new Date(dateStr)
  return format(date, "HH:mm")
}

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return "今日"
  if (isYesterday(date)) return "昨日"
  return format(date, "M月d日(E)", { locale: ja })
}

function getDateKey(dateStr: string): string {
  return format(new Date(dateStr), "yyyy-MM-dd")
}

// Stable color palette for user avatars
const AVATAR_COLORS = [
  "#b71c1c", "#1565c0", "#2e7d32", "#e65100",
  "#6a1b9a", "#00838f", "#4e342e", "#37474f",
]

function getUserColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function TalkPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map())
  const [inputValue, setInputValue] = useState("")
  const [sending, setSending] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isNearBottomRef = useRef(true)
  const messagesRef = useRef<Message[]>([])

  // Keep ref in sync
  messagesRef.current = messages

  const scrollToBottom = useCallback((smooth = false) => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({
        behavior: smooth ? "smooth" : "instant",
      })
    })
  }, [])

  // Load initial data
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [msgs, profs] = await Promise.all([
          getMessages(50),
          getAllProfiles(),
        ])
        if (cancelled) return

        // Messages come newest-first from API, reverse for display
        const sorted = [...msgs].reverse()
        setMessages(sorted)
        setHasMore(msgs.length === 50)

        const profileMap = new Map<string, Profile>()
        profs.forEach((p) => profileMap.set(p.id, p))
        setProfiles(profileMap)
      } catch (err) {
        console.error("Failed to load messages:", err)
      } finally {
        if (!cancelled) setLoadingInitial(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // Scroll to bottom after initial load
  useEffect(() => {
    if (!loadingInitial && messages.length > 0) {
      scrollToBottom()
    }
  }, [loadingInitial, scrollToBottom, messages.length])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages((prev) => {
            // Avoid duplicates (our own sent messages may already be added)
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          // Auto-scroll if user is near bottom
          if (isNearBottomRef.current) {
            setTimeout(() => scrollToBottom(true), 50)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [scrollToBottom])

  // Track scroll position to determine if user is near bottom
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight
      isNearBottomRef.current = distanceFromBottom < 100

      // Load older messages when scrolled to top
      if (el.scrollTop < 50 && hasMore && !loadingOlder) {
        loadOlderMessages()
      }
    },
    [hasMore, loadingOlder]
  )

  const loadOlderMessages = useCallback(async () => {
    const current = messagesRef.current
    if (current.length === 0 || loadingOlder || !hasMore) return

    setLoadingOlder(true)
    const scrollEl = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null

    const prevScrollHeight = scrollEl?.scrollHeight ?? 0

    try {
      const oldest = current[0]
      const older = await getMessages(50, oldest.created_at)
      const sorted = [...older].reverse()

      if (sorted.length < 50) setHasMore(false)
      if (sorted.length > 0) {
        setMessages((prev) => [...sorted, ...prev])

        // Preserve scroll position
        requestAnimationFrame(() => {
          if (scrollEl) {
            const newScrollHeight = scrollEl.scrollHeight
            scrollEl.scrollTop = newScrollHeight - prevScrollHeight
          }
        })
      }
    } catch (err) {
      console.error("Failed to load older messages:", err)
    } finally {
      setLoadingOlder(false)
    }
  }, [hasMore, loadingOlder])

  // Send message
  const handleSend = useCallback(async () => {
    if (!user || !inputValue.trim() || sending) return

    const content = inputValue.trim()
    setInputValue("")
    setSending(true)

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }

    try {
      const sent = await sendMessage(user.id, content)
      // Optimistic: add immediately (realtime will deduplicate)
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev
        return [...prev, sent]
      })
      scrollToBottom(true)
    } catch (err) {
      console.error("Failed to send message:", err)
      // Restore input on failure
      setInputValue(content)
    } finally {
      setSending(false)
    }
  }, [user, inputValue, sending, scrollToBottom])

  // Auto-grow textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const el = e.target
    el.style.height = "auto"
    const maxHeight = 72 // ~3 lines
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Group messages by date for date separators
  const renderMessages = () => {
    const elements: React.ReactNode[] = []
    let lastDateKey = ""

    for (const msg of messages) {
      const dateKey = getDateKey(msg.created_at)
      if (dateKey !== lastDateKey) {
        lastDateKey = dateKey
        elements.push(
          <div
            key={`date-${dateKey}`}
            className="flex justify-center my-3"
          >
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {formatDateSeparator(msg.created_at)}
            </span>
          </div>
        )
      }

      const isMine = msg.user_id === user?.id
      const profile = profiles.get(msg.user_id)
      const displayName = profile?.display_name ?? "不明"
      const initial = displayName.charAt(0).toUpperCase()
      const avatarColor = getUserColor(msg.user_id)

      if (isMine) {
        elements.push(
          <div key={msg.id} className="flex justify-end px-4 mb-2">
            <div className="flex items-end gap-1.5 max-w-[80%]">
              <span className="text-[10px] text-gray-400 mb-1 shrink-0">
                {formatMessageTime(msg.created_at)}
              </span>
              <div className="bg-[#b71c1c] text-white px-3 py-2 rounded-2xl rounded-br-md text-sm leading-relaxed break-words whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          </div>
        )
      } else {
        elements.push(
          <div key={msg.id} className="flex px-4 mb-2">
            <div className="flex gap-2 max-w-[80%]">
              <Avatar className="size-8 shrink-0 mt-5">
                <AvatarFallback
                  className="text-white text-xs font-semibold"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-[11px] text-gray-500 mb-0.5 ml-1">
                  {displayName}
                </span>
                <div className="flex items-end gap-1.5">
                  <div className="bg-white border border-gray-200 px-3 py-2 rounded-2xl rounded-bl-md text-sm leading-relaxed break-words whitespace-pre-wrap">
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-gray-400 mb-1 shrink-0">
                    {formatMessageTime(msg.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )
      }
    }

    return elements
  }

  // Height: viewport minus MobileLayout header (56px) minus bottom nav (64px)
  const containerStyle = "flex flex-col -mb-16"
  const containerHeight = "calc(100dvh - 56px - 64px)"

  if (loadingInitial) {
    return (
      <div className={containerStyle} style={{ height: containerHeight }}>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="size-8 border-2 border-[#b71c1c] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">読み込み中...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={containerStyle} style={{ height: containerHeight }}>
      {/* Messages area */}
      <ScrollArea
        ref={scrollAreaRef}
        className="flex-1"
        onScrollCapture={handleScroll}
      >
        <div className="py-4">
          {loadingOlder && (
            <div className="flex justify-center py-3">
              <div className="size-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!hasMore && messages.length > 0 && (
            <div className="flex justify-center py-3">
              <span className="text-xs text-gray-400">
                これ以上メッセージはありません
              </span>
            </div>
          )}

          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <span className="text-2xl text-gray-400">💬</span>
              </div>
              <p className="text-gray-500 text-sm">
                まだメッセージがありません
              </p>
              <p className="text-gray-400 text-xs mt-1">
                最初のメッセージを送信しましょう
              </p>
            </div>
          )}

          {renderMessages()}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input bar */}
      <div className="border-t border-gray-200 bg-white px-3 py-2 shrink-0 pb-2">
        <div className="flex items-end gap-2 max-w-lg mx-auto">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2 text-sm leading-normal focus:outline-none focus:ring-2 focus:ring-[#b71c1c]/30 focus:border-[#b71c1c] transition-colors"
            style={{ maxHeight: "72px" }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || sending}
            className="shrink-0 size-10 rounded-full bg-[#b71c1c] text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-opacity active:scale-95"
          >
            <SendHorizonal className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
