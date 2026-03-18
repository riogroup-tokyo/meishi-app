"use client"

import { Download, FileSpreadsheet, Contact } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { exportAsCSV, exportAsVCard } from "@/lib/export"
import { toast } from "sonner"
import type { BusinessCard } from "@/types/database"

interface ExportMenuProps {
  cards: BusinessCard[]
}

export function ExportMenu({ cards }: ExportMenuProps) {
  const handleCSVExport = () => {
    if (cards.length === 0) {
      toast.error("エクスポートする名刺がありません")
      return
    }
    try {
      exportAsCSV(cards)
      toast.success(`${cards.length} 件の名刺を CSV でエクスポートしました`)
    } catch {
      toast.error("CSV エクスポートに失敗しました")
    }
  }

  const handleVCardExport = () => {
    if (cards.length === 0) {
      toast.error("エクスポートする名刺がありません")
      return
    }
    try {
      exportAsVCard(cards)
      toast.success(`${cards.length} 件の名刺を vCard でエクスポートしました`)
    } catch {
      toast.error("vCard エクスポートに失敗しました")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm">
            <Download className="size-4 mr-1.5" />
            エクスポート
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={6}>
        <DropdownMenuItem onClick={handleCSVExport}>
          <FileSpreadsheet className="size-4" />
          CSV でエクスポート
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleVCardExport}>
          <Contact className="size-4" />
          vCard でエクスポート
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
