"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Camera,
  ImageIcon,
  Loader2,
  Plus,
  X,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/components/AuthProvider"
import {
  createCard,
  getTags,
  createTag,
  addTagToCard,
} from "@/lib/actions"
import { recognizeBusinessCard } from "@/lib/ocr"
import {
  compressImage,
  fileToDataUrl,
  uploadCardImage,
} from "@/lib/image-utils"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { Tag } from "@/types/database"

const TAG_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
]

export default function CardRegister() {
  const router = useRouter()
  const { user, loading: authLoading, isAuthenticated } = useAuth()

  // Image
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)

  // Form fields
  const [companyName, setCompanyName] = useState("")
  const [department, setDepartment] = useState("")
  const [position, setPosition] = useState("")
  const [personName, setPersonName] = useState("")
  const [personNameKana, setPersonNameKana] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [mobilePhone, setMobilePhone] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [address, setAddress] = useState("")
  const [website, setWebsite] = useState("")
  const [memo, setMemo] = useState("")

  // Tags
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])

  // Save state
  const [saving, setSaving] = useState(false)

  // Refs
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Fetch tags
  useEffect(() => {
    if (!user) return
    getTags(user.id)
      .then(setTags)
      .catch((err) => console.error("Failed to fetch tags:", err))
  }, [user])

  // Handle image selection
  const handleImageSelected = useCallback(
    async (file: File) => {
      try {
        // Compress
        const compressed = await compressImage(file)
        setImageFile(compressed)

        // Preview
        const dataUrl = await fileToDataUrl(compressed)
        setImagePreview(dataUrl)

        // Auto OCR
        setOcrLoading(true)
        try {
          const result = await recognizeBusinessCard(compressed)

          // Auto-fill form
          if (result.company_name) setCompanyName(result.company_name)
          if (result.department) setDepartment(result.department)
          if (result.position) setPosition(result.position)
          if (result.person_name) setPersonName(result.person_name)
          if (result.person_name_kana) setPersonNameKana(result.person_name_kana)
          if (result.email) setEmail(result.email)
          if (result.phone) setPhone(result.phone)
          if (result.mobile_phone) setMobilePhone(result.mobile_phone)
          if (result.postal_code) setPostalCode(result.postal_code)
          if (result.address) setAddress(result.address)
          if (result.website) setWebsite(result.website)

          toast.success("名刺を読み取りました")
        } catch (err) {
          console.error("OCR failed:", err)
          toast.error("名刺の読み取りに失敗しました。手動で入力してください。")
        } finally {
          setOcrLoading(false)
        }
      } catch (err) {
        console.error("Image processing failed:", err)
        toast.error("画像の処理に失敗しました")
      }
    },
    []
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleImageSelected(file)
      }
      // Reset the input so the same file can be re-selected
      e.target.value = ""
    },
    [handleImageSelected]
  )

  // Toggle tag selection
  const handleToggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    )
  }, [])

  // Create new tag
  const handleCreateNewTag = useCallback(async () => {
    if (!user || !newTagName.trim()) return
    try {
      const tag = await createTag({
        user_id: user.id,
        name: newTagName.trim(),
        color: newTagColor,
      })
      setTags((prev) => [...prev, tag])
      setSelectedTagIds((prev) => [...prev, tag.id])
      setNewTagName("")
      setShowNewTag(false)
      toast.success("タグを作成しました")
    } catch {
      toast.error("タグの作成に失敗しました")
    }
  }, [user, newTagName, newTagColor])

  // Save card
  const handleSave = useCallback(async () => {
    if (!user) return

    if (!personName.trim()) {
      toast.error("氏名は必須です")
      return
    }

    setSaving(true)
    try {
      let imageUrl: string | null = null

      // Upload image
      if (imageFile) {
        imageUrl = await uploadCardImage(imageFile, user.id)
      }

      // Create card
      const card = await createCard({
        user_id: user.id,
        image_url: imageUrl,
        company_name: companyName || null,
        department: department || null,
        position: position || null,
        person_name: personName.trim(),
        person_name_kana: personNameKana || null,
        email: email || null,
        phone: phone || null,
        mobile_phone: mobilePhone || null,
        postal_code: postalCode || null,
        address: address || null,
        website: website || null,
        memo: memo || null,
      })

      // Link tags
      for (const tagId of selectedTagIds) {
        await addTagToCard(card.id, tagId)
      }

      toast.success("名刺を保存しました")
      router.push("/")
    } catch (err) {
      console.error("Failed to save card:", err)
      toast.error("名刺の保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }, [
    user,
    imageFile,
    companyName,
    department,
    position,
    personName,
    personNameKana,
    email,
    phone,
    mobilePhone,
    postalCode,
    address,
    website,
    memo,
    selectedTagIds,
    router,
  ])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-12">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm text-[#b71c1c] font-medium"
          >
            キャンセル
          </button>
          <h1 className="text-base font-bold text-foreground">名刺登録</h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="px-4 py-4 pb-32">
        {/* Image capture section */}
        <div className="mb-6">
          {imagePreview ? (
            <div className="relative">
              <img
                src={imagePreview}
                alt="名刺プレビュー"
                className="w-full rounded-xl object-contain max-h-48 bg-muted"
              />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null)
                  setImagePreview(null)
                }}
                className="absolute top-2 right-2 size-7 rounded-full bg-black/50 text-white flex items-center justify-center"
              >
                <X className="size-4" />
              </button>
              {ocrLoading && (
                <div className="absolute inset-0 rounded-xl bg-black/50 flex flex-col items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-white mb-2" />
                  <p className="text-white text-sm font-medium">
                    読み取り中...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-[#b71c1c]/30 bg-[#b71c1c]/5 text-[#b71c1c] active:bg-[#b71c1c]/10 transition-colors"
              >
                <Camera className="size-8" />
                <span className="text-sm font-medium">名刺を撮影</span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-border bg-muted/50 text-muted-foreground active:bg-muted transition-colors"
              >
                <ImageIcon className="size-8" />
                <span className="text-sm font-medium">写真を選択</span>
              </button>
            </div>
          )}

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <Separator className="mb-6" />

        {/* Form */}
        <div className="space-y-4">
          {/* Company */}
          <div>
            <Label htmlFor="company_name" className="text-xs text-muted-foreground mb-1 block">
              会社名
            </Label>
            <Input
              id="company_name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="株式会社サンプル"
              className="h-10"
            />
          </div>

          {/* Department */}
          <div>
            <Label htmlFor="department" className="text-xs text-muted-foreground mb-1 block">
              部署
            </Label>
            <Input
              id="department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="営業部"
              className="h-10"
            />
          </div>

          {/* Position */}
          <div>
            <Label htmlFor="position" className="text-xs text-muted-foreground mb-1 block">
              役職
            </Label>
            <Input
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="部長"
              className="h-10"
            />
          </div>

          <Separator />

          {/* Person name (required) */}
          <div>
            <Label htmlFor="person_name" className="text-xs text-muted-foreground mb-1 block">
              氏名 <span className="text-[#b71c1c]">*</span>
            </Label>
            <Input
              id="person_name"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="山田 太郎"
              className="h-10"
              required
            />
          </div>

          {/* Kana */}
          <div>
            <Label htmlFor="person_name_kana" className="text-xs text-muted-foreground mb-1 block">
              フリガナ
            </Label>
            <Input
              id="person_name_kana"
              value={personNameKana}
              onChange={(e) => setPersonNameKana(e.target.value)}
              placeholder="ヤマダ タロウ"
              className="h-10"
            />
          </div>

          <Separator />

          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-xs text-muted-foreground mb-1 block">
              メール
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="yamada@example.com"
              className="h-10"
            />
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone" className="text-xs text-muted-foreground mb-1 block">
              電話番号
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="03-1234-5678"
              className="h-10"
            />
          </div>

          {/* Mobile */}
          <div>
            <Label htmlFor="mobile_phone" className="text-xs text-muted-foreground mb-1 block">
              携帯電話
            </Label>
            <Input
              id="mobile_phone"
              type="tel"
              value={mobilePhone}
              onChange={(e) => setMobilePhone(e.target.value)}
              placeholder="090-1234-5678"
              className="h-10"
            />
          </div>

          <Separator />

          {/* Postal code */}
          <div>
            <Label htmlFor="postal_code" className="text-xs text-muted-foreground mb-1 block">
              〒 郵便番号
            </Label>
            <Input
              id="postal_code"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="100-0001"
              className="h-10"
            />
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="address" className="text-xs text-muted-foreground mb-1 block">
              住所
            </Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="東京都千代田区..."
              className="h-10"
            />
          </div>

          {/* Website */}
          <div>
            <Label htmlFor="website" className="text-xs text-muted-foreground mb-1 block">
              ウェブサイト
            </Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="h-10"
            />
          </div>

          <Separator />

          {/* Memo */}
          <div>
            <Label htmlFor="memo" className="text-xs text-muted-foreground mb-1 block">
              メモ
            </Label>
            <textarea
              id="memo"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="メモを入力..."
              rows={3}
              className="w-full rounded-lg border border-border bg-background p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#b71c1c]/30 focus:border-[#b71c1c] transition-colors"
            />
          </div>

          <Separator />

          {/* Tags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground">タグ</Label>
              <button
                type="button"
                onClick={() => setShowNewTag(!showNewTag)}
                className="p-1 rounded-full hover:bg-muted transition-colors"
              >
                <Plus className="size-4 text-muted-foreground" />
              </button>
            </div>

            {/* Existing tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {tags.map((tag) => {
                  const isSelected = selectedTagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border-2",
                        isSelected
                          ? "border-[#b71c1c] bg-[#b71c1c]/5 text-[#b71c1c]"
                          : "border-transparent bg-muted text-muted-foreground hover:bg-muted/80"
                      )}
                    >
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                      {isSelected && <Check className="size-3" />}
                    </button>
                  )
                })}
              </div>
            )}

            {/* New tag input */}
            {showNewTag && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-3">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="タグ名"
                  className="h-9"
                />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground mr-1">色:</span>
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewTagColor(color)}
                      className={cn(
                        "size-6 rounded-full transition-all",
                        newTagColor === color
                          ? "ring-2 ring-offset-2 ring-[#b71c1c] scale-110"
                          : "hover:scale-105"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleCreateNewTag}
                    disabled={!newTagName.trim()}
                    className="bg-[#b71c1c] hover:bg-[#b71c1c]/90 text-white"
                  >
                    追加
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowNewTag(false)
                      setNewTagName("")
                    }}
                  >
                    キャンセル
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed save button */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-background border-t safe-area-bottom">
        <Button
          onClick={handleSave}
          disabled={saving || !personName.trim()}
          className="w-full h-12 bg-[#b71c1c] hover:bg-[#b71c1c]/90 text-white text-base font-semibold rounded-xl"
        >
          {saving ? (
            <>
              <Loader2 className="size-5 animate-spin mr-2" />
              保存中...
            </>
          ) : (
            "保存"
          )}
        </Button>
      </div>
    </div>
  )
}
