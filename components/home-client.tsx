"use client"

import type React from "react"
import { useState } from "react"
import Image from "next/image"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import ConversationCard from "@/components/conversation-card"
import Link from "next/link"

interface Category {
  id: string
  name: string
  slug: string
  description: string
}

interface Conversation {
  id: string
  title: string
  description: string
  slug: string
  participants: string[]
  views: number
  author: string
  createdAt: string
  categoryId: string
  featureImage?: string | null
}

interface HomeClientProps {
  initialCategories: Category[]
  initialConversations: Conversation[]
}

export default function HomeClient({ initialCategories, initialConversations }: HomeClientProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categories] = useState<Category[]>(initialCategories)
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations)
  const [loadingConversations, setLoadingConversations] = useState(false)

  // Fetch conversations when category changes
  const handleCategoryChange = async (categoryId: string | null) => {
    setSelectedCategory(categoryId)
    setLoadingConversations(true)
    try {
      const url = categoryId ? `/api/conversations?categoryId=${categoryId}` : "/api/conversations"
      const response = await fetch(url)
      const data = await response.json()
      if (data.conversations) {
        setConversations(data.conversations)
      }
    } catch (error) {
      console.error("[v0] Error fetching conversations:", error)
    } finally {
      setLoadingConversations(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <>
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
          <div className="flex flex-col lg:flex-row lg:items-center lg:gap-12 gap-10">
            <div className="flex-1 space-y-6 min-w-0">
              <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold text-foreground">AI Personas Debate Any Topic</h1>
                <p className="text-lg text-muted-foreground max-w-2xl">
                  Create dynamic podcast conversations where AI personas debate, discuss, and explore topics from every
                  angle.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/create" className="flex-1 sm:flex-none">
                  <Button size="lg" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90">
                    Create Conversation
                  </Button>
                </Link>
                <Link href="/guests" className="flex-1 sm:flex-none">
                  <Button size="lg" variant="outline" className="w-full bg-transparent">
                    Browse Agents
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex-1 flex justify-center lg:justify-end">
              <div className="relative w-full max-w-md lg:max-w-lg aspect-[4/3]">
                <Image
                  src="/images/hero.png"
                  alt="AI personas and a human collaborating around a table with holographic data visualization"
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex-1">
        {/* Search */}
        <div className="mb-10">
          <form onSubmit={handleSearch}>
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
        </div>

        {/* Browse by Category - Prominent section */}
        <div className="mb-14 rounded-xl border border-border bg-white p-6 md:p-8 shadow-sm">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">Browse by Category</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleCategoryChange(null)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                selectedCategory === null
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-secondary text-foreground hover:bg-secondary/80 hover:scale-105"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <Link key={cat.id} href={`/category/${cat.slug}`}>
                <button
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-secondary text-foreground hover:bg-secondary/80 hover:scale-105"
                  }`}
                >
                  {cat.name}
                </button>
              </Link>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">
            {selectedCategory ? categories.find((c) => c.id === selectedCategory)?.name : "Popular Conversations"}
          </h2>
          {loadingConversations ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">Loading conversations...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {conversations.length > 0 ? (
                conversations.map((conv) => <ConversationCard key={conv.id} conversation={conv} />)
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No conversations found.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
