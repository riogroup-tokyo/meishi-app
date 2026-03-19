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
  const panelRef = useRef<HTMLDivElement>(null)
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

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
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
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-full hover:bg-white/20 transition-colors"
        aria-label="通知"
      >
        <Bell className="size-5 text-white/80" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-white rounded-xl shadow-xl border border-gray-200 z-[60] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">通知</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-[#b71c1c] font-medium hover:underline"
              >
                すべて既読
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="size-5 border-2 border-gray-300 border-t-[#b71c1c] rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
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
                  className={`flex items-start gap-3 w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
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
      )}
    </div>
  )
}
