"use client"

import { CreditCard, Grid3X3, List, Plus, Menu, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchBar } from "@/components/SearchBar"
import { useCardStore } from "@/stores/card-store"

interface HeaderProps {
  onMenuClick: () => void
  onAddCard: () => void
  userEmail?: string | null
  onLogout?: () => void
}

export function Header({ onMenuClick, onAddCard, userEmail, onLogout }: HeaderProps) {
  const { viewMode, setViewMode } = useCardStore()

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
      <div className="flex items-center gap-3 h-14 px-4">
        {/* Mobile menu */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="size-5" />
        </Button>

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="size-7 rounded-md bg-primary flex items-center justify-center">
            <CreditCard className="size-4 text-primary-foreground" />
          </div>
          <h1 className="text-base font-semibold tracking-tight hidden sm:block">
            名刺管理
          </h1>
        </div>

        {/* Desktop search */}
        <div className="flex-1 max-w-md mx-auto hidden md:block">
          <SearchBar />
        </div>

        <div className="flex-1 md:hidden" />

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* View toggle */}
          <div className="hidden sm:flex items-center rounded-lg border p-0.5">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="size-3.5" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon-xs"
              onClick={() => setViewMode("list")}
            >
              <List className="size-3.5" />
            </Button>
          </div>

          {/* Add card */}
          <Button
            size="sm"
            onClick={onAddCard}
            className="hidden sm:inline-flex"
          >
            <Plus className="size-4 mr-1" />
            追加
          </Button>

          {/* User & logout */}
          {userEmail && (
            <div className="flex items-center gap-2 ml-2 pl-2 border-l">
              <span className="text-xs text-muted-foreground hidden md:inline max-w-[140px] truncate">
                {userEmail}
              </span>
              {onLogout && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onLogout}
                  title="ログアウト"
                >
                  <LogOut className="size-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
