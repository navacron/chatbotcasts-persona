"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Loader2, LogIn } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"
import { useRouter } from "next/navigation"

interface PublishConversationProps {
  conversationData: any
  chatData: any
}

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
}

export default function PublishConversation({ conversationData, chatData }: PublishConversationProps) {
  const [title, setTitle] = useState(chatData?.topic || conversationData?.topic || "")
  const [description, setDescription] = useState("")
  const [slug, setSlug] = useState("")
  const [isPublic, setIsPublic] = useState(true)
  const [published, setPublished] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [personaNames, setPersonaNames] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        )
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setIsAuthenticated(!!user)
      } catch (error) {
        console.error("[v0] Error checking auth:", error)
        setIsAuthenticated(false)
      } finally {
        setCheckingAuth(false)
      }
    }

    checkAuth()
  }, [])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories")
        const data = await response.json()
        setCategories(data.categories || [])

        const otherCategory = data.categories?.find((c: Category) => c.slug === "other")
        if (otherCategory) {
          setSelectedCategoryId(otherCategory.id)
        }
      } catch (error) {
        console.error("[v0] Error fetching categories:", error)
      } finally {
        setLoadingCategories(false)
      }
    }

    fetchCategories()
  }, [])

  useEffect(() => {
    const fetchPersonaNames = async () => {
      if (!chatData?.personas || chatData.personas.length === 0) return

      try {
        const response = await fetch("/api/personas")
        const data = await response.json()

        const allPersonas = [...(data.publicPersonas || []), ...(data.myPersonas || [])]

        const names = chatData.personas
          .map((id: string) => {
            const persona = allPersonas.find((p: any) => p.id === id)
            return persona?.name
          })
          .filter(Boolean)

        setPersonaNames(names)
      } catch (error) {
        console.error("[v0] Error fetching persona names:", error)
      }
    }

    fetchPersonaNames()

    if (title && !slug) {
      setSlug(generateSlug(title))
    }
  }, [chatData, title, slug])

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!slug || slug === generateSlug(title)) {
      setSlug(generateSlug(value))
    }
  }

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  const handlePublish = async () => {
    if (!isAuthenticated) {
      setError("Please sign in to publish your conversation")
      return
    }

    if (!title.trim()) {
      setError("Please enter a conversation title")
      return
    }

    if (!slug.trim()) {
      setError("Please enter a slug")
      return
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      setError("Slug can only contain lowercase letters, numbers, and hyphens")
      return
    }

    if (!selectedCategoryId) {
      setError("Please select a category")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const formattedMessages = (chatData?.messages || []).map((msg: any, index: number) => ({
        id: msg.id || index + 1,
        role: msg.name,
        content: msg.message,
        personaId: msg.persona,
        citations: msg.citations || [],
        timestamp: msg.timestamp || new Date().toISOString(),
      }))

      const dataToSave = {
        title: title,
        content: description || "", // Summary/description
        slug: slug,
        allPersonaIds: chatData?.personas || [],
        currentPersonaId: chatData?.personas?.[0] || null,
        messages: formattedMessages,
      }

      const response = await fetch("/api/addUpdateConversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          slug,
          topic: chatData?.topic || conversationData?.topic || "General Discussion",
          data: dataToSave,
          isPublic,
          personaIds: chatData?.personas || [],
          categoryId: selectedCategoryId,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to publish conversation")
      }

      setPublished(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const formattedChat =
    chatData?.messages?.map((msg: any) => `${msg.name}: ${msg.message}`).join("\n\n") || "No messages yet"

  if (checkingAuth) {
    return (
      <div className="bg-white border border-border rounded-lg p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-white border border-border rounded-lg p-8 space-y-6">
        <div className="text-center space-y-4">
          <LogIn className="h-16 w-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold text-foreground">Sign In to Publish</h2>
          <p className="text-muted-foreground">
            You need to be signed in to publish and share your conversation with the community.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Why sign in?</strong> Publishing your conversation earns you credits for each view and interaction.
            You can use these credits to create more conversations!
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => router.push("/auth/login?redirect=/create")}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            Sign In to Continue
          </Button>
          <Button variant="outline" onClick={() => router.push("/auth/signup?redirect=/create")} className="w-full">
            Create New Account
          </Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Conversation Preview</label>
          <div className="bg-muted/50 border border-border rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">{formattedChat}</pre>
          </div>
          <p className="text-xs text-muted-foreground">Your conversation will be saved once you sign in</p>
        </div>
      </div>
    )
  }

  if (published) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
        <h2 className="text-2xl font-bold text-green-900">Conversation Published!</h2>
        <p className="text-green-700">
          Your conversation has been shared with the community. You can view it on the home page.
        </p>
        <div className="bg-white border border-green-300 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-2">Your conversation URL:</p>
          <code className="text-sm font-mono text-foreground bg-muted px-3 py-1 rounded">/posts/{slug}</code>
        </div>
        <div className="flex gap-4 justify-center pt-4">
          <Button variant="outline" onClick={() => (window.location.href = `/posts/${slug}`)}>
            View Conversation
          </Button>
          <Button onClick={() => (window.location.href = "/create")}>Create Another</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-border rounded-lg p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Publish Your Conversation</h1>
        <p className="text-muted-foreground">Share your AI conversation with the community and earn credits</p>
      </div>

      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-900">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Conversation Title</label>
          <Input
            placeholder="e.g., AI Ethics: Three Perspectives"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="h-11"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">URL Slug</label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">/posts/</span>
            <Input
              placeholder="ai-ethics-three-perspectives"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
              className="h-11 flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Only lowercase letters, numbers, and hyphens. This will be your conversation's URL.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Category</label>
          {loadingCategories ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading categories...
            </div>
          ) : (
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full h-11 px-3 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          )}
          <p className="text-xs text-muted-foreground">Choose the category that best describes your conversation</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Chat Participants</label>
          <div className="bg-muted/50 border border-border rounded-lg p-3">
            {personaNames.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {personaNames.map((name, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No participants selected</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Conversation Preview</label>
          <div className="bg-muted/50 border border-border rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">{formattedChat}</pre>
          </div>
          <p className="text-xs text-muted-foreground">
            {chatData?.messages?.length || 0} messages in this conversation
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">Description</label>
          <textarea
            placeholder="Describe what this conversation is about..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-24 p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">Privacy</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" checked={isPublic} onChange={() => setIsPublic(true)} className="w-4 h-4" />
              <span className="text-foreground">Public (anyone can find and use)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="radio" checked={!isPublic} onChange={() => setIsPublic(false)} className="w-4 h-4" />
              <span className="text-foreground">Private (only with link)</span>
            </label>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Earn Credits:</strong> When your conversation is published, you earn credits for each view and
            interaction. Use these to create more conversations!
          </p>
        </div>

        <div className="flex gap-4 pt-4">
          <Button variant="outline" disabled={isLoading}>
            Save as Draft
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish Conversation"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
