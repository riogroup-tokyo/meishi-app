"use client"

import { MobileLayout } from "@/components/MobileLayout"
import { TalkPage } from "@/components/TalkPage"

export default function TalkRoute() {
  return (
    <MobileLayout title="トーク" noPadding>
      <TalkPage />
    </MobileLayout>
  )
}
