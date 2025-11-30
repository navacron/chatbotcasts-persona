"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CheckCircle2, Loader2, LogIn, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"

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
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [personaNames, setPersonaNames] = useState<string[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [loadingCategories, setLoadingCategories] = useState(true)
  const router = useRouter()
  const { user, isLoaded } = useUser()

  const isAuthenticated = isLoaded && !!user
  const checkingAuth = !isLoaded

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

  const generateSummary = async () => {
    if (!chatData?.messages || chatData.messages.length === 0) {
      setError("No messages to summarize")
      return
    }

    setIsGeneratingSummary(true)
    setError(null)

    try {
      const conversationText = chatData.messages.map((msg: any) => `${msg.name}: ${msg.message}`).join("\n\n")

      const response = await fetch("/api/ai/perplexity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Please provide a concise summary of the following conversation in less than 500 words. Focus on the main topics discussed, key insights shared, and important conclusions reached. Do not include HTML tags in your response.\n\nConversation:\n${conversationText}`,
            },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate summary")
      }

      const data = await response.json()
      const summary = data.text || ""

      setDescription(summary)
    } catch (err) {
      console.error("[v0] Error generating summary:", err)
      setError(err instanceof Error ? err.message : "Failed to generate summary")
    } finally {
      setIsGeneratingSummary(false)
    }
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
      let finalDescription = description
      if (!description.trim() && chatData?.messages && chatData.messages.length > 0) {
        console.log("[v0] No description provided, generating summary...")

        const conversationText = chatData.messages.map((msg: any) => `${msg.name}: ${msg.message}`).join("\n\n")

        const summaryResponse = await fetch("/api/ai/perplexity", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [
              {
                role: "user",
                content: `Please provide a concise summary of the following conversation in less than 500 words. Focus on the main topics discussed, key insights shared, and important conclusions reached. Do not include HTML tags in your response.\n\nConversation:\n${conversationText}`,
              },
            ],
          }),
        })

        if (summaryResponse.ok) {
          const summaryData = await summaryResponse.json()
          finalDescription = summaryData.text || ""
          setDescription(finalDescription)
          console.log("[v0] Generated summary:", finalDescription)
        } else {
          console.error("[v0] Failed to generate summary, proceeding without it")
        }
      }

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
        content: finalDescription || "",
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
          description: finalDescription,
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
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">Description</label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={generateSummary}
              disabled={isGeneratingSummary || !chatData?.messages || chatData.messages.length === 0}
              className="h-8 bg-transparent"
            >
              {isGeneratingSummary ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Generate Summary
                </>
              )}
            </Button>
          </div>
          <textarea
            placeholder="Describe what this conversation is about... (Auto-generated if left empty)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-24 p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty to auto-generate a summary when publishing, or click "Generate Summary" to preview
          </p>
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
          <Button variant="outline" disabled={isLoading || isGeneratingSummary}>
            Save as Draft
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isLoading || isGeneratingSummary}
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
