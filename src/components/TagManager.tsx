"use client"

import { useState, useCallback } from "react"
import type { Tag } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  TagsIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  PencilIcon,
  XIcon,
} from "lucide-react"

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
  "#78716c", // stone
] as const

interface TagWithCount extends Tag {
  cardCount: number
}

interface TagManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tags: TagWithCount[]
  onCreateTag: (name: string, color: string) => void
  onUpdateTag: (tagId: string, updates: { name?: string; color?: string }) => void
  onDeleteTag: (tagId: string) => void
}

export default function TagManager({
  open,
  onOpenChange,
  tags,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: TagManagerProps) {
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState<string>(PRESET_COLORS[5])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [colorPickerId, setColorPickerId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const handleCreateTag = useCallback(() => {
    const name = newTagName.trim()
    if (!name) return
    onCreateTag(name, newTagColor)
    setNewTagName("")
    setNewTagColor(PRESET_COLORS[5])
  }, [newTagName, newTagColor, onCreateTag])

  const handleStartEdit = useCallback((tag: TagWithCount) => {
    setEditingId(tag.id)
    setEditingName(tag.name)
  }, [])

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return
    const name = editingName.trim()
    if (!name) return
    onUpdateTag(editingId, { name })
    setEditingId(null)
    setEditingName("")
  }, [editingId, editingName, onUpdateTag])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
    setEditingName("")
  }, [])

  const handleColorChange = useCallback(
    (tagId: string, color: string) => {
      onUpdateTag(tagId, { color })
      setColorPickerId(null)
    },
    [onUpdateTag]
  )

  const handleDeleteConfirm = useCallback(
    (tagId: string) => {
      onDeleteTag(tagId)
      setDeleteConfirmId(null)
    },
    [onDeleteTag]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagsIcon className="size-5" />
            タグ管理
          </DialogTitle>
          <DialogDescription>
            タグの作成、編集、削除ができます。
          </DialogDescription>
        </DialogHeader>

        {/* Tag list */}
        <ScrollArea className="max-h-80">
          <div className="space-y-1 pr-2">
            {tags.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                タグがありません
              </p>
            ) : (
              tags.map((tag) => (
                <div key={tag.id} className="space-y-0">
                  <div className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
                    {/* Color dot / color picker */}
                    <div className="relative">
                      <button
                        type="button"
                        className="flex size-5 shrink-0 items-center justify-center rounded-full ring-2 ring-background transition-transform hover:scale-110"
                        style={{ backgroundColor: tag.color }}
                        onClick={() =>
                          setColorPickerId(
                            colorPickerId === tag.id ? null : tag.id
                          )
                        }
                        aria-label="色を変更"
                      />
                    </div>

                    {/* Name (editable) */}
                    {editingId === tag.id ? (
                      <div className="flex flex-1 items-center gap-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit()
                            if (e.key === "Escape") handleCancelEdit()
                          }}
                          className="h-6 text-sm"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={handleSaveEdit}
                        >
                          <CheckIcon className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={handleCancelEdit}
                        >
                          <XIcon className="size-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="flex-1 truncate text-sm">
                        {tag.name}
                      </span>
                    )}

                    {/* Card count */}
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {tag.cardCount}枚
                    </span>

                    {/* Actions */}
                    {editingId !== tag.id && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleStartEdit(tag)}
                        >
                          <PencilIcon className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() =>
                            setDeleteConfirmId(
                              deleteConfirmId === tag.id ? null : tag.id
                            )
                          }
                        >
                          <TrashIcon className="size-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Color picker */}
                  {colorPickerId === tag.id && (
                    <div className="flex flex-wrap gap-1.5 px-2 py-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className="flex size-6 items-center justify-center rounded-full transition-transform hover:scale-110"
                          style={{ backgroundColor: color }}
                          onClick={() => handleColorChange(tag.id, color)}
                          aria-label={`色: ${color}`}
                        >
                          {tag.color === color && (
                            <CheckIcon className="size-3 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Delete confirmation */}
                  {deleteConfirmId === tag.id && (
                    <div className="flex items-center gap-2 rounded-md bg-destructive/5 px-2 py-2">
                      <span className="flex-1 text-xs text-destructive">
                        このタグを削除しますか？
                      </span>
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => handleDeleteConfirm(tag.id)}
                      >
                        削除
                      </Button>
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        キャンセル
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Create new tag */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            新しいタグを作成
          </p>
          <div className="flex items-center gap-2">
            {/* Color selector for new tag */}
            <div className="relative">
              <button
                type="button"
                className="flex size-7 shrink-0 items-center justify-center rounded-full ring-2 ring-background transition-transform hover:scale-110"
                style={{ backgroundColor: newTagColor }}
                onClick={() =>
                  setColorPickerId(
                    colorPickerId === "__new__" ? null : "__new__"
                  )
                }
                aria-label="色を選択"
              />
            </div>
            <Input
              placeholder="タグ名を入力..."
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateTag()
              }}
              className="h-8 flex-1"
            />
            <Button
              size="sm"
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
            >
              <PlusIcon className="size-3.5" />
              追加
            </Button>
          </div>

          {/* Color picker for new tag */}
          {colorPickerId === "__new__" && (
            <div className="flex flex-wrap gap-1.5 px-1 py-1">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className="flex size-6 items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setNewTagColor(color)
                    setColorPickerId(null)
                  }}
                  aria-label={`色: ${color}`}
                >
                  {newTagColor === color && (
                    <CheckIcon className="size-3 text-white" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
