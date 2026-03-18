"use client"

import { MobileLayout } from "@/components/MobileLayout"
import { CalendarPage } from "@/components/CalendarPage"

export default function CalendarRoute() {
  return (
    <MobileLayout title="カレンダー">
      <CalendarPage />
    </MobileLayout>
  )
}
