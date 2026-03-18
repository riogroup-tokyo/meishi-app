"use client"

import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useCardStore } from "@/stores/card-store"

export function SearchBar({ className }: { className?: string }) {
  const { searchQuery, setSearchQuery } = useCardStore()
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setSearchQuery(localQuery)
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [localQuery, setSearchQuery])

  useEffect(() => {
    setLocalQuery(searchQuery)
  }, [searchQuery])

  return (
    <div className={`relative ${className ?? ""}`}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        placeholder="名前、会社名、メールで検索..."
        value={localQuery}
        onChange={(e) => setLocalQuery(e.target.value)}
        className="pl-8 pr-8 h-9"
      />
      {localQuery && (
        <Button
          variant="ghost"
          size="icon-xs"
          className="absolute right-1 top-1/2 -translate-y-1/2"
          onClick={() => {
            setLocalQuery("")
            setSearchQuery("")
          }}
        >
          <X className="size-3.5" />
        </Button>
      )}
    </div>
  )
}
