"use client"

import { CreditCard, Plus, Scan } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  onAddCard: () => void
}

export function EmptyState({ onAddCard }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-4">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="size-24 rounded-2xl bg-muted flex items-center justify-center">
          <CreditCard className="size-12 text-muted-foreground/50" />
        </div>
        <div className="absolute -bottom-2 -right-2 size-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Scan className="size-5 text-primary/60" />
        </div>
      </div>

      {/* Text */}
      <h2 className="text-lg font-semibold text-foreground mb-2">
        名刺がまだ登録されていません
      </h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
        名刺を撮影またはアップロードして、デジタル管理を始めましょう
      </p>

      {/* Action */}
      <Button
        size="lg"
        onClick={onAddCard}
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        <Plus className="size-5 mr-2" />
        最初の名刺を追加
      </Button>
    </div>
  )
}
