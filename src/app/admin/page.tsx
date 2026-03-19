"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/AuthProvider"
import { MobileLayout } from "@/components/MobileLayout"
import AdminPanel from "@/components/AdminPanel"
import { LoadingScreen } from "@/components/LoadingScreen"

export default function AdminPage() {
  const router = useRouter()
  const { loading, isAuthenticated, isAdmin } = useAuth()

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isAdmin)) {
      router.push("/")
    }
  }, [loading, isAuthenticated, isAdmin, router])

  if (loading) {
    return <LoadingScreen />
  }

  if (!isAuthenticated || !isAdmin) {
    return null
  }

  return (
    <MobileLayout title="管理者設定" noPadding>
      <AdminPanel />
    </MobileLayout>
  )
}
