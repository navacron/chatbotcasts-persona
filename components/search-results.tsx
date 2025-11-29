"use client"

import type React from "react"

import { useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import ConversationCard from "@/components/conversation-card"
import { useRouter } from "next/navigation"

interface Conversation {
  id: string
  title: string
  description: string
  slug: string
  participants: string[]
  views: number
  author: string
  featureImage?: string | null
  similarity?: number
}

export default function SearchResults() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQuery = searchParams.get("q") || ""

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchResults() {
      if (!initialQuery) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(initialQuery)}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch search results")
        }

        setConversations(data.conversations || [])
      } catch (err) {
        console.error("[v0] Error fetching search results:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [initialQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex-1">
      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white border-border"
            />
          </div>
          <Button type="submit" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
            Search
          </Button>
        </div>
      </form>

      {/* Results Header */}
      {initialQuery && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Search results for &quot;{initialQuery}&quot;</h1>
          {!loading && (
            <p className="text-muted-foreground mt-1">
              {conversations.length} {conversations.length === 1 ? "result" : "results"} found
            </p>
          )}
        </div>
      )}

      {/* Results Content */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Searching...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">Error: {error}</p>
        </div>
      ) : !initialQuery ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Enter a search query to find conversations</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No conversations found matching your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {conversations.map((conv) => (
            <ConversationCard key={conv.id} conversation={conv} />
          ))}
        </div>
      )}
    </div>
  )
}
