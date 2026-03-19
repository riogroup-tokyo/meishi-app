"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Bell } from "lucide-react"
import { useAuth } from "@/components/AuthProvider"
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  generateNotifications,
} from "@/lib/actions"
import type { Notification } from "@/types/database"

export default function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const generatedRef = useRef(false)

  // Generate notifications once on mount
  useEffect(() => {
    if (!user || generatedRef.current) return
    generatedRef.current = true
    generateNotifications(user.id).then(() => {
      // Refresh count after generation
      getUnreadNotificationCount(user.id).then(setUnreadCount).catch(() => {})
    }).catch(() => {})
  }, [user])

  // Fetch unread count
  useEffect(() => {
    if (!user) return
    getUnreadNotificationCount(user.id).then(setUnreadCount).catch(() => {})
  }, [user])

  // Fetch full list when panel opens
  useEffect(() => {
    if (!open || !user) return
    setLoading(true)
    getNotifications(user.id)
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, user])

  // Lock body scroll when panel is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [open])

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await markNotificationRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {
      // ignore
    }
  }, [])

  const handleMarkAllRead = useCallback(async () => {
    if (!user) return
    try {
      await markAllNotificationsRead(user.id)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // ignore
    }
  }, [user])

  const getIcon = (type: string) => {
    if (type === "birthday") return "\uD83C\uDF82"
    if (type === "no_visit") return "\uD83D\uDCC5"
    return "\uD83D\uDD14"
  }

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return "たった今"
    if (diffMin < 60) return `${diffMin}分前`
    const diffHours = Math.floor(diffMin / 60)
    if (diffHours < 24) return `${diffHours}時間前`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}日前`
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-full hover:bg-white/20 transition-colors"
        aria-label="通知"
      >
        <Bell className="size-5 text-white/80" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 size-[10px] rounded-full bg-white shadow-sm" />
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[100] bg-black/30"
            onClick={() => setOpen(false)}
          />
          {/* Panel */}
          <div className="fixed top-0 right-0 z-[101] w-full max-w-sm h-full bg-white shadow-xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[#b71c1c]">
              <h3 className="text-sm font-bold text-white">通知</h3>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-xs text-white/80 font-medium hover:text-white"
                  >
                    すべて既読
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-white/80 hover:text-white text-lg leading-none"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="size-6 border-2 border-gray-300 border-t-[#b71c1c] rounded-full animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <span className="text-3xl mb-2">🔔</span>
                  <p className="text-sm text-gray-400">通知はありません</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!n.is_read) handleMarkRead(n.id)
                    }}
                    className={`flex items-start gap-3 w-full px-4 py-3 text-left border-b border-gray-50 transition-colors active:bg-gray-100 ${
                      !n.is_read ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <span className="text-lg flex-shrink-0 mt-0.5">{getIcon(n.type)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="size-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatTimestamp(n.created_at)}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
