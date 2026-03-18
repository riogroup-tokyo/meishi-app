"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { useAuth } from "@/components/AuthProvider"
import { LoadingScreen } from "@/components/LoadingScreen"
import { BottomNav } from "@/components/BottomNav"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface MobileLayoutProps {
  children: ReactNode
  title: string
  showSearch?: boolean
  rightAction?: ReactNode
}

export function MobileLayout({
  children,
  title,
  showSearch = false,
  rightAction,
}: MobileLayoutProps) {
  const router = useRouter()
  const { user, profile, loading, isAuthenticated } = useAuth()

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
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
          <h1 className="text-lg font-bold text-foreground">{title}</h1>
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
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom navigation */}
      <BottomNav />
    </div>
  )
}
