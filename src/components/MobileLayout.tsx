"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Search, Settings } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/AuthProvider"
import { LoadingScreen } from "@/components/LoadingScreen"
import { BottomNav } from "@/components/BottomNav"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import NotificationBell from "@/components/NotificationBell"

interface MobileLayoutProps {
  children: ReactNode
  title: string
  showSearch?: boolean
  rightAction?: ReactNode
  hideHeader?: boolean
  noPadding?: boolean
}

export function MobileLayout({
  children,
  title,
  showSearch = false,
  rightAction,
  hideHeader = false,
  noPadding = false,
}: MobileLayoutProps) {
  const router = useRouter()
  const { user, profile, loading, isAuthenticated, isAdmin } = useAuth()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [loading, isAuthenticated, router])

  if (loading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated) {
    return null
  }

  const displayName = profile?.display_name || user?.email || ""
  const avatarInitial = displayName.charAt(0).toUpperCase()

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Brand Header */}
      <header className="bg-[#b71c1c] text-center py-3 pb-2 relative">
        {isAdmin && (
          <Link
            href="/admin"
            className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/20 transition-colors"
            aria-label="管理者設定"
          >
            <Settings className="size-5 text-white/80" />
          </Link>
        )}
        <img
          src="https://ranking.riogroup.info/img/logo.png"
          alt="RioGroupロゴ"
          className="max-w-[200px] mx-auto"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <NotificationBell />
        </div>
      </header>

      {/* Page Header */}
      {!hideHeader && (
        <div className="sticky top-0 z-40 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between h-12 px-4 max-w-lg mx-auto">
            <h1 className="text-base font-bold text-foreground">{title}</h1>
            <div className="flex items-center gap-2">
              {showSearch && (
                <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                  <Search className="size-5 text-gray-600" />
                </button>
              )}
              {rightAction}
              <Avatar className="size-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-[#b71c1c] text-white text-xs font-semibold">
                  {avatarInitial}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className={`flex-1 overflow-y-auto ${noPadding ? '' : 'pb-16'}`}>
        <div className="max-w-lg mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
