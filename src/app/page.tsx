"use client"

import { MobileLayout } from "@/components/MobileLayout"
import CardBook from "@/components/CardBook"

export default function Page() {
  return (
    <MobileLayout title="名刺帳" hideHeader>
      <CardBook />
    </MobileLayout>
  )
}
