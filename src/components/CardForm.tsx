"use client"

import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from "react"
import type { BusinessCard, Tag } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  ImageIcon,
  UploadIcon,
  ScanLineIcon,
  LoaderCircleIcon,
  XIcon,
  PlusIcon,
  ChevronsUpDownIcon,
  CheckIcon,
} from "lucide-react"

export interface CardFormData {
  company_name: string
  department: string
  position: string
  person_name: string
  person_name_kana: string
  email: string
  phone: string
  mobile_phone: string
  postal_code: string
  address: string
  website: string
  memo: string
  image_url: string | null
  tagIds: string[]
}

interface CardFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card?: BusinessCard | null
  existingTags: Tag[]
  initialTagIds?: string[]
  onSave: (data: CardFormData) => void
  onCreateTag?: (name: string) => Promise<Tag | null>
  saving?: boolean
}

const EMPTY_FORM: CardFormData = {
  company_name: "",
  department: "",
  position: "",
  person_name: "",
  person_name_kana: "",
  email: "",
  phone: "",
  mobile_phone: "",
  postal_code: "",
  address: "",
  website: "",
  memo: "",
  image_url: null,
  tagIds: [],
}

function cardToFormData(
  card: BusinessCard | null | undefined,
  tagIds: string[]
): CardFormData {
  if (!card) return { ...EMPTY_FORM }
  return {
    company_name: card.company_name ?? "",
    department: card.department ?? "",
    position: card.position ?? "",
    person_name: card.person_name,
    person_name_kana: card.person_name_kana ?? "",
    email: card.email ?? "",
    phone: card.phone ?? "",
    mobile_phone: card.mobile_phone ?? "",
    postal_code: card.postal_code ?? "",
    address: card.address ?? "",
    website: card.website ?? "",
    memo: card.memo ?? "",
    image_url: card.image_url ?? null,
    tagIds,
  }
}

export default function CardForm({
  open,
  onOpenChange,
  card,
  existingTags,
  initialTagIds = [],
  onSave,
  onCreateTag,
  saving = false,
}: CardFormProps) {
  const [form, setForm] = useState<CardFormData>(() =>
    cardToFormData(card, initialTagIds)
  )
  const [imagePreview, setImagePreview] = useState<string | null>(
    card?.image_url ?? null
  )
  const [isDragging, setIsDragging] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrProgress, setOcrProgress] = useState("")
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)
  const [newTagInput, setNewTagInput] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isEditing = !!card

  // Reset form when dialog opens with new card data
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        setForm(cardToFormData(card, initialTagIds))
        setImagePreview(card?.image_url ?? null)
        setOcrLoading(false)
        setOcrProgress("")
      }
      onOpenChange(nextOpen)
    },
    [card, initialTagIds, onOpenChange]
  )

  const updateField = useCallback(
    (field: keyof CardFormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }))
    },
    []
  )

  // Image handling
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return
      try {
        const { fileToDataUrl, compressImage } = await import("@/lib/image-utils")
        const compressed = await compressImage(file)
        const dataUrl = await fileToDataUrl(compressed)
        setImagePreview(dataUrl)
        setForm((prev) => ({ ...prev, image_url: dataUrl }))
      } catch {
        // fallback: read directly
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          setImagePreview(result)
          setForm((prev) => ({ ...prev, image_url: result }))
        }
        reader.readAsDataURL(file)
      }
    },
    []
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileSelect(file)
    },
    [handleFileSelect]
  )

  // OCR
  const handleOcr = useCallback(async () => {
    if (!imagePreview) return
    setOcrLoading(true)
    setOcrProgress("名刺を読み取り中...")
    try {
      const { recognizeBusinessCard } = await import("@/lib/ocr")
      // Convert data URL to File for the OCR function
      const res = await fetch(imagePreview)
      const blob = await res.blob()
      const file = new File([blob], "card.jpg", { type: blob.type })
      const result = await recognizeBusinessCard(file)
      // Auto-fill form fields from OCR result
      setForm((prev) => ({
        ...prev,
        company_name: result.company_name || prev.company_name,
        department: result.department || prev.department,
        position: result.position || prev.position,
        person_name: result.person_name || prev.person_name,
        person_name_kana: result.person_name_kana || prev.person_name_kana,
        email: result.email || prev.email,
        phone: result.phone || prev.phone,
        mobile_phone: result.mobile_phone || prev.mobile_phone,
        postal_code: result.postal_code || prev.postal_code,
        address: result.address || prev.address,
        website: result.website || prev.website,
      }))
    } catch (err) {
      console.error("OCR failed:", err)
      setOcrProgress("読み取りに失敗しました")
    } finally {
      setOcrLoading(false)
      setOcrProgress("")
    }
  }, [imagePreview])

  // Tags
  const toggleTag = useCallback((tagId: string) => {
    setForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }))
  }, [])

  const handleCreateNewTag = useCallback(async () => {
    const name = newTagInput.trim()
    if (!name || !onCreateTag) return
    const tag = await onCreateTag(name)
    if (tag) {
      setForm((prev) => ({ ...prev, tagIds: [...prev.tagIds, tag.id] }))
    }
    setNewTagInput("")
  }, [newTagInput, onCreateTag])

  // Submit
  const handleSubmit = useCallback(() => {
    if (!form.person_name.trim()) return
    onSave(form)
  }, [form, onSave])

  const selectedTags = existingTags.filter((t) => form.tagIds.includes(t.id))

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "名刺を編集" : "名刺を追加"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "名刺の情報を更新します。"
              : "新しい名刺を登録します。"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-10rem)] pr-3">
          <div className="space-y-5 pb-1">
            {/* Image upload area */}
            <div className="space-y-2">
              <Label>名刺画像</Label>
              <div
                className={`relative flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleInputChange}
                />

                {imagePreview ? (
                  <div className="relative w-full">
                    <img
                      src={imagePreview}
                      alt="名刺プレビュー"
                      className="mx-auto max-h-48 rounded-md object-contain"
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="absolute top-1 right-1 bg-background/80"
                      onClick={(e) => {
                        e.stopPropagation()
                        setImagePreview(null)
                        setForm((prev) => ({ ...prev, image_url: null }))
                      }}
                    >
                      <XIcon className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 p-6 text-muted-foreground">
                    <UploadIcon className="size-8" />
                    <p className="text-sm">
                      ドラッグ&ドロップ、またはクリックしてアップロード
                    </p>
                  </div>
                )}
              </div>

              {/* OCR button */}
              {imagePreview && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleOcr}
                  disabled={ocrLoading}
                >
                  {ocrLoading ? (
                    <>
                      <LoaderCircleIcon className="size-3.5 animate-spin" />
                      {ocrProgress || "名刺を読み取り中..."}
                    </>
                  ) : (
                    <>
                      <ScanLineIcon className="size-3.5" />
                      OCRで読み取り
                    </>
                  )}
                </Button>
              )}
            </div>

            <Separator />

            {/* Form fields */}
            <div className="space-y-3">
              {/* Company */}
              <div className="space-y-1">
                <Label htmlFor="company_name">会社名</Label>
                <Input
                  id="company_name"
                  value={form.company_name}
                  onChange={(e) => updateField("company_name", e.target.value)}
                  placeholder="株式会社サンプル"
                />
              </div>

              {/* Department + Position row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="department">部署</Label>
                  <Input
                    id="department"
                    value={form.department}
                    onChange={(e) => updateField("department", e.target.value)}
                    placeholder="営業部"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="position">役職</Label>
                  <Input
                    id="position"
                    value={form.position}
                    onChange={(e) => updateField("position", e.target.value)}
                    placeholder="部長"
                  />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <Label htmlFor="person_name">
                  氏名 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="person_name"
                  value={form.person_name}
                  onChange={(e) => updateField("person_name", e.target.value)}
                  placeholder="山田 太郎"
                  required
                />
              </div>

              {/* Kana */}
              <div className="space-y-1">
                <Label htmlFor="person_name_kana">フリガナ</Label>
                <Input
                  id="person_name_kana"
                  value={form.person_name_kana}
                  onChange={(e) =>
                    updateField("person_name_kana", e.target.value)
                  }
                  placeholder="ヤマダ タロウ"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="email">メール</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="yamada@example.com"
                />
              </div>

              {/* Phone + Mobile row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="phone">電話番号</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="03-1234-5678"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mobile_phone">携帯電話</Label>
                  <Input
                    id="mobile_phone"
                    type="tel"
                    value={form.mobile_phone}
                    onChange={(e) => updateField("mobile_phone", e.target.value)}
                    placeholder="090-1234-5678"
                  />
                </div>
              </div>

              {/* Postal code + Address */}
              <div className="space-y-1">
                <Label htmlFor="postal_code">〒 郵便番号</Label>
                <Input
                  id="postal_code"
                  value={form.postal_code}
                  onChange={(e) => updateField("postal_code", e.target.value)}
                  placeholder="100-0001"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="address">住所</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="東京都千代田区千代田1-1"
                />
              </div>

              {/* Website */}
              <div className="space-y-1">
                <Label htmlFor="website">ウェブサイト</Label>
                <Input
                  id="website"
                  type="url"
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              {/* Memo */}
              <div className="space-y-1">
                <Label htmlFor="memo">メモ</Label>
                <Textarea
                  id="memo"
                  value={form.memo}
                  onChange={(e) => updateField("memo", e.target.value)}
                  placeholder="メモを入力..."
                  className="min-h-20"
                />
              </div>

              <Separator />

              {/* Tags */}
              <div className="space-y-2">
                <Label>タグ</Label>

                {/* Selected tags display */}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant="secondary"
                        className="gap-1"
                      >
                        <span
                          className="inline-block size-2 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                        <button
                          type="button"
                          className="ml-0.5 rounded-full hover:bg-foreground/10"
                          onClick={() => toggleTag(tag.id)}
                        >
                          <XIcon className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Tag selector */}
                <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
                  <PopoverTrigger
                    className="flex h-8 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  >
                    <span className="text-muted-foreground">タグを選択...</span>
                    <ChevronsUpDownIcon className="size-3.5 text-muted-foreground" />
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    <Command>
                      <CommandInput
                        placeholder="タグを検索..."
                        value={newTagInput}
                        onValueChange={setNewTagInput}
                      />
                      <CommandList>
                        <CommandEmpty>
                          {newTagInput.trim() && onCreateTag ? (
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted"
                              onClick={handleCreateNewTag}
                            >
                              <PlusIcon className="size-3.5" />
                              &quot;{newTagInput.trim()}&quot; を作成
                            </button>
                          ) : (
                            <span>タグが見つかりません</span>
                          )}
                        </CommandEmpty>
                        <CommandGroup>
                          {existingTags.map((tag) => (
                            <CommandItem
                              key={tag.id}
                              value={tag.name}
                              onSelect={() => toggleTag(tag.id)}
                              data-checked={form.tagIds.includes(tag.id)}
                            >
                              <span
                                className="inline-block size-2.5 shrink-0 rounded-full"
                                style={{ backgroundColor: tag.color }}
                              />
                              <span className="flex-1 truncate">
                                {tag.name}
                              </span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.person_name.trim() || saving}
          >
            {saving ? (
              <>
                <LoaderCircleIcon className="size-3.5 animate-spin" />
                保存中...
              </>
            ) : (
              "保存"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
