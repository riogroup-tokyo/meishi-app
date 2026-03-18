"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { CreditCard, Camera, MessageCircle, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface NavItem {
  label: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  badge?: number
}

interface BottomNavProps {
  unreadCount?: number
}

const navItems: NavItem[] = [
  { label: "名刺帳", icon: CreditCard, path: "/" },
  { label: "名刺登録", icon: Camera, path: "/register" },
  { label: "トーク", icon: MessageCircle, path: "/talk" },
  { label: "カレンダー", icon: Calendar, path: "/calendar" },
]

export function BottomNav({ unreadCount = 0 }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-bottom"
      style={{
        boxShadow: "0 -1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path
          const Icon = item.icon
          const showBadge = item.path === "/talk" && unreadCount > 0

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                relative flex flex-col items-center justify-center
                flex-1 h-full gap-0.5
                transition-colors duration-150
                ${isActive ? "text-[#b71c1c]" : "text-gray-400"}
              `}
            >
              <div className="relative">
                <Icon className={`size-5 ${isActive ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
                {showBadge && (
                  <Badge
                    className="absolute -top-1.5 -right-2.5 h-4 min-w-4 px-1 text-[10px] font-bold bg-[#b71c1c] text-white border-2 border-white rounded-full flex items-center justify-center"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Badge>
                )}
              </div>
              <span className={`text-[10px] leading-tight ${isActive ? "font-semibold" : "font-normal"}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
