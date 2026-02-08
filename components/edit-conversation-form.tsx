"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
}

interface ConversationForEdit {
  id: string
  slug?: string
  title: string
  description?: string
  topic?: string
  data: unknown
  is_public?: boolean
  category_id?: string
  feature_image?: string | null
}

interface EditConversationFormProps {
  conversation: ConversationForEdit
  personaIds: string[]
  categories: Category[]
}

export default function EditConversationForm({
  conversation,
  personaIds,
  categories,
}: EditConversationFormProps) {
  const [title, setTitle] = useState(conversation.title)
  const [description, setDescription] = useState(conversation.description ?? "")
  const [topic, setTopic] = useState(conversation.topic ?? "")
  const [isPublic, setIsPublic] = useState(conversation.is_public ?? true)
  const [selectedCategoryId, setSelectedCategoryId] = useState(conversation.category_id ?? "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (conversation.category_id) setSelectedCategoryId(conversation.category_id)
  }, [conversation.category_id])

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Please enter a title")
      return
    }
    if (!selectedCategoryId) {
      setError("Please select a category")
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      const dataToSave = {
        ...(typeof conversation.data === "object" && conversation.data !== null ? conversation.data : {}),
        title,
        content: description,
        messages: (conversation.data as { messages?: unknown[] })?.messages ?? [],
      }
      const response = await fetch(`/api/conversations/by-id/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          topic: topic || "General Discussion",
          data: dataToSave,
          isPublic,
          categoryId: selectedCategoryId,
          personaIds,
          feature_image: (conversation as { feature_image?: string | null }).feature_image,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to save")
      setSaved(true)
      const slug = (conversation as { slug?: string }).slug
      if (slug) setTimeout(() => router.push(`/posts/${slug}`), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  if (saved) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center space-y-4">
        <h2 className="text-2xl font-bold text-green-900">Changes saved</h2>
        <p className="text-green-700">Redirecting to your post...</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-border rounded-lg p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Edit this post</h1>
        <p className="text-muted-foreground">Update title, description, and settings. Same URL is preserved.</p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-900">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-11" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Topic</label>
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} className="h-11" placeholder="e.g. AI Ethics" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-24 p-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Describe what this conversation is about..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Category</label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full h-11 px-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">Privacy</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="w-4 h-4" />
              <span className="text-foreground">Public</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} className="w-4 h-4" />
              <span className="text-foreground">Private</span>
            </label>
          </div>
        </div>

        <div className="flex gap-4 pt-4">
          <Button variant="outline" onClick={() => router.back()} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading} className="flex-1">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
