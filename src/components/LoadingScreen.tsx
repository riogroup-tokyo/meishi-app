"use client"

import { Loader2 } from "lucide-react"

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#b71c1c] z-50">
      <img
        src="https://ranking.riogroup.info/img/logo.png"
        alt="RioGroupロゴ"
        className="max-w-[200px] mb-4"
      />
      <p className="text-white/90 text-sm font-medium mb-4">名刺管理</p>
      <Loader2 className="size-6 text-white/70 animate-spin" />
    </div>
  )
}
