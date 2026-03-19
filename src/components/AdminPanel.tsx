"use client"

import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/components/AuthProvider"
import {
  getAllProfiles,
  getGroupCards,
  adminDeleteCard,
  adminDeleteProfile,
  setAdminStatus,
  getPendingSignupRequests,
  approveSignupRequest,
  rejectSignupRequest,
} from "@/lib/actions"
import type { SignupRequest } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Shield,
  ShieldOff,
  Trash2,
  TriangleAlertIcon,
  Users,
  CreditCard,
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Profile, BusinessCard } from "@/types/database"

type AdminTab = "requests" | "users" | "cards"

export default function AdminPanel() {
  const { user, isAdmin } = useAuth()

  const [activeTab, setActiveTab] = useState<AdminTab>("requests")
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [cards, setCards] = useState<BusinessCard[]>([])
  const [requests, setRequests] = useState<SignupRequest[]>([])
  const [loading, setLoading] = useState(true)

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "profile" | "card"
    id: string
    name: string
  } | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Admin toggle loading
  const [adminToggleLoading, setAdminToggleLoading] = useState<string | null>(null)

  // Request action loading
  const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [p, c, r] = await Promise.all([
        getAllProfiles(),
        getGroupCards(),
        getPendingSignupRequests(),
      ])
      setProfiles(p)
      setCards(c)
      setRequests(r)
    } catch (err) {
      console.error("Failed to fetch admin data:", err)
      toast.error("データの取得に失敗しました")
    } finally {
      setLoading(false)
    }
  }, [])

  const handleApprove = useCallback(async (requestId: string) => {
    if (!user) return
    setRequestActionLoading(requestId)
    try {
      await approveSignupRequest(requestId, user.id)
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      toast.success("アカウントを承認しました")
      // Refresh profiles
      getAllProfiles().then(setProfiles).catch(() => {})
    } catch {
      toast.error("承認に失敗しました")
    } finally {
      setRequestActionLoading(null)
    }
  }, [user])

  const handleReject = useCallback(async (requestId: string) => {
    if (!user) return
    setRequestActionLoading(requestId)
    try {
      await rejectSignupRequest(requestId, user.id)
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      toast.success("リクエストを拒否しました")
    } catch {
      toast.error("拒否に失敗しました")
    } finally {
      setRequestActionLoading(null)
    }
  }, [user])

  useEffect(() => {
    if (isAdmin) {
      fetchData()
    }
  }, [isAdmin, fetchData])

  const handleToggleAdmin = useCallback(
    async (profileId: string, currentIsAdmin: boolean) => {
      setAdminToggleLoading(profileId)
      try {
        await setAdminStatus(profileId, !currentIsAdmin)
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === profileId ? { ...p, is_admin: !currentIsAdmin } : p
          )
        )
        toast.success(
          !currentIsAdmin ? "管理者に設定しました" : "管理者を解除しました"
        )
      } catch {
        toast.error("管理者設定の変更に失敗しました")
      } finally {
        setAdminToggleLoading(null)
      }
    },
    []
  )

  const handleDeleteRequest = useCallback(
    (type: "profile" | "card", id: string, name: string) => {
      setDeleteTarget({ type, id, name })
      setDeleteDialogOpen(true)
    },
    []
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      if (deleteTarget.type === "profile") {
        await adminDeleteProfile(deleteTarget.id)
        setProfiles((prev) => prev.filter((p) => p.id !== deleteTarget.id))
        // Also remove cards belonging to deleted user
        setCards((prev) => prev.filter((c) => c.user_id !== deleteTarget.id))
        toast.success("アカウントを削除しました")
      } else {
        await adminDeleteCard(deleteTarget.id)
        setCards((prev) => prev.filter((c) => c.id !== deleteTarget.id))
        toast.success("名刺を削除しました")
      }
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    } catch {
      toast.error("削除に失敗しました")
    } finally {
      setDeleteLoading(false)
    }
  }, [deleteTarget])

  const getProfileName = useCallback(
    (userId: string) => {
      const profile = profiles.find((p) => p.id === userId)
      return profile?.display_name ?? "不明"
    },
    [profiles]
  )

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">
          管理者権限がありません
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab bar */}
      <div className="flex border-b bg-background sticky top-0 z-10">
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={cn(
            "flex-1 py-3 text-sm font-medium text-center transition-colors relative flex items-center justify-center gap-1.5",
            activeTab === "requests"
              ? "text-[#b71c1c]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          新規申請
          {requests.length > 0 && (
            <span className="size-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {requests.length}
            </span>
          )}
          {activeTab === "requests" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b71c1c]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={cn(
            "flex-1 py-3 text-sm font-medium text-center transition-colors relative flex items-center justify-center gap-1.5",
            activeTab === "users"
              ? "text-[#b71c1c]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="size-4" />
          ユーザー
          {activeTab === "users" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b71c1c]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("cards")}
          className={cn(
            "flex-1 py-3 text-sm font-medium text-center transition-colors relative flex items-center justify-center gap-1.5",
            activeTab === "cards"
              ? "text-[#b71c1c]"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CreditCard className="size-4" />
          全名刺
          {activeTab === "cards" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#b71c1c]" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "requests" ? (
          /* === Signup Requests Tab === */
          <div>
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="text-3xl mb-3">✅</span>
                <p className="text-sm text-muted-foreground">承認待ちのリクエストはありません</p>
              </div>
            ) : (
              <div className="divide-y">
                {requests.map((req) => (
                  <div key={req.id} className="px-4 py-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="size-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-semibold">
                        {req.display_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{req.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{req.email}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(req.created_at).toLocaleDateString("ja-JP")} 申請
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-[#b71c1c] hover:bg-[#b71c1c]/90 text-white"
                        disabled={requestActionLoading === req.id}
                        onClick={() => handleApprove(req.id)}
                      >
                        {requestActionLoading === req.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          "許可"
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        disabled={requestActionLoading === req.id}
                        onClick={() => handleReject(req.id)}
                      >
                        拒否
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === "users" ? (
          <div className="divide-y">
            {profiles.map((profile) => {
              const isSelf = profile.id === user?.id
              return (
                <div
                  key={profile.id}
                  className="px-4 py-3 flex items-center gap-3"
                >
                  {/* Avatar */}
                  <div className="size-10 rounded-full bg-[#b71c1c]/10 flex items-center justify-center text-[#b71c1c] font-semibold text-sm shrink-0">
                    {(profile.display_name ?? "?").charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {profile.display_name ?? "未設定"}
                      </p>
                      {profile.is_admin && (
                        <Badge
                          variant="secondary"
                          className="bg-[#b71c1c]/10 text-[#b71c1c] text-[10px] px-1.5 py-0"
                        >
                          管理者
                        </Badge>
                      )}
                      {isSelf && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          自分
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.email ?? "メール未設定"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-8 px-2 text-xs",
                        profile.is_admin
                          ? "text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          : "text-[#b71c1c] hover:text-[#b71c1c] hover:bg-[#b71c1c]/5"
                      )}
                      onClick={() =>
                        handleToggleAdmin(profile.id, profile.is_admin)
                      }
                      disabled={
                        adminToggleLoading === profile.id || isSelf
                      }
                    >
                      {adminToggleLoading === profile.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : profile.is_admin ? (
                        <>
                          <ShieldOff className="size-3.5 mr-1" />
                          解除
                        </>
                      ) : (
                        <>
                          <Shield className="size-3.5 mr-1" />
                          管理者
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() =>
                        handleDeleteRequest(
                          "profile",
                          profile.id,
                          profile.display_name ?? "不明なユーザー"
                        )
                      }
                      disabled={isSelf}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              )
            })}
            {profiles.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm text-muted-foreground">
                  ユーザーがいません
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y">
            {cards.map((card) => (
              <div
                key={card.id}
                className="px-4 py-3 flex items-center gap-3"
              >
                {/* Avatar */}
                <div className="shrink-0">
                  {card.image_url ? (
                    <div className="size-10 rounded-full overflow-hidden bg-muted">
                      <img
                        src={card.image_url}
                        alt={card.person_name}
                        className="size-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="size-10 rounded-full bg-[#b71c1c]/10 flex items-center justify-center text-[#b71c1c] font-semibold text-sm">
                      {card.person_name?.charAt(0) ?? "?"}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {card.person_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[card.company_name, card.department]
                      .filter(Boolean)
                      .join(" / ") || "会社名なし"}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    登録者: {getProfileName(card.user_id)}
                  </p>
                </div>

                {/* Delete */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                  onClick={() =>
                    handleDeleteRequest("card", card.id, card.person_name)
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
            {cards.length === 0 && (
              <div className="flex items-center justify-center py-20">
                <p className="text-sm text-muted-foreground">
                  名刺がありません
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlertIcon className="size-5 text-destructive" />
              {deleteTarget?.type === "profile"
                ? "アカウント削除"
                : "名刺削除"}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === "profile"
                ? `「${deleteTarget?.name}」のアカウントを削除しますか？関連するすべてのデータが削除されます。この操作は元に戻せません。`
                : `「${deleteTarget?.name}」の名刺を削除しますか？この操作は元に戻せません。`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? "削除中..." : "削除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
