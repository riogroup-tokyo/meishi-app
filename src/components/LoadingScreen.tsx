"use client"

import { CreditCard, Loader2 } from "lucide-react"

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
      <div className="flex items-center gap-3 mb-6">
        <div className="size-10 rounded-lg bg-primary flex items-center justify-center">
          <CreditCard className="size-6 text-primary-foreground" />
        </div>
        <span className="text-xl font-semibold tracking-tight">名刺管理</span>
      </div>
      <Loader2 className="size-6 text-muted-foreground animate-spin" />
    </div>
  )
}
