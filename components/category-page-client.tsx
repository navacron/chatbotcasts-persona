"use client"

import type React from "react"

import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import ConversationCard from "@/components/conversation-card"
import Header from "@/components/header"
import Footer from "@/components/footer"
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
  categorySlug?: string | null
  featureImage?: string | null
}

interface CategoryPageClientProps {
  category: Category
  initialConversations: Conversation[]
}

export default function CategoryPageClient({ category, initialConversations }: CategoryPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("")

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Category Hero Section */}
      <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>/</span>
              <span className="text-foreground">Categories</span>
              <span>/</span>
              <span className="text-foreground">{category.name}</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">{category.name} Conversations</h1>
              {category.description && (
                <p className="text-lg text-muted-foreground max-w-2xl">{category.description}</p>
              )}
              <p className="text-sm text-muted-foreground">
                {initialConversations.length} conversation{initialConversations.length !== 1 ? "s" : ""} in this
                category
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex-1">
        {/* Search Bar */}
        <div className="mb-8">
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

        {/* Conversations Grid */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Latest Conversations</h2>
          {initialConversations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {initialConversations.map((conv) => (
                <ConversationCard key={conv.id} conversation={conv} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No conversations found in this category yet.</p>
              <Link href="/create" className="inline-block mt-4">
                <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  Create First Conversation
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
