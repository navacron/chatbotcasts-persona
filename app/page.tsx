"use client"

import type React from "react"

import { useState, useEffect } from "react"
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
  featureImage?: string | null
}

interface Persona {
  id: string
  name: string
  prompt: string
  document_link: string | null
  is_public: boolean
  user_id: string
  created_at: string
  updated_at: string
}

const CATEGORIES = [
  { id: "tech", name: "Technology", color: "from-blue-500 to-blue-600" },
  { id: "business", name: "Business", color: "from-green-500 to-green-600" },
  { id: "science", name: "Science", color: "from-purple-500 to-purple-600" },
  { id: "philosophy", name: "Philosophy", color: "from-pink-500 to-pink-600" },
]

const MOCK_CONVERSATIONS = [
  {
    id: "1",
    title: "AI Ethics Debate",
    description: "Andrew Ng and Yann LeCun discuss the ethical implications of AI",
    slug: "ai-ethics-debate",
    participants: ["Andrew Ng", "Yann LeCun"],
    views: 2400,
    author: "Alex Chen",
    createdAt: "2023-10-01",
    categoryId: "tech",
    featureImage: "https://example.com/image1.jpg",
  },
  {
    id: "2",
    title: "The Future of Work",
    description: "Discussing remote work, automation, and human productivity",
    slug: "the-future-of-work",
    participants: ["Satya Nadella", "Tim Cook"],
    views: 1800,
    author: "Sarah Mitchell",
    createdAt: "2023-09-25",
    categoryId: "business",
    featureImage: "https://example.com/image2.jpg",
  },
  {
    id: "3",
    title: "Climate Change Solutions",
    description: "Scientists discuss renewable energy and sustainability",
    slug: "climate-change-solutions",
    participants: ["Neil deGrasse Tyson", "Jane Goodall"],
    views: 3200,
    author: "Mike Johnson",
    createdAt: "2023-10-05",
    categoryId: "science",
    featureImage: "https://example.com/image3.jpg",
  },
  {
    id: "4",
    title: "Meaning and Purpose",
    description: "Exploring existentialism and the meaning of life",
    slug: "meaning-and-purpose",
    participants: ["Bertrand Russell", "Simone Weil"],
    views: 1500,
    author: "Emma Wilson",
    createdAt: "2023-09-30",
    categoryId: "philosophy",
    featureImage: "https://example.com/image4.jpg",
  },
]

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/categories")
        const data = await response.json()
        if (data.categories) {
          setCategories(data.categories)
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
    async function fetchConversations() {
      setLoadingConversations(true)
      try {
        const url = selectedCategory ? `/api/conversations?categoryId=${selectedCategory}` : "/api/conversations"
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
    fetchConversations()
  }, [selectedCategory])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
          <div className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">AI Personas Debate Any Topic</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Create dynamic podcast conversations where AI personas debate, discuss, and explore topics from every angle.
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
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex-1">
        {/* Search and Filters */}
        <div className="space-y-6 mb-12">
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

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground hover:bg-secondary/80"
              }`}
            >
              All Categories
            </button>
            {loadingCategories ? (
              <div className="text-sm text-muted-foreground">Loading categories...</div>
            ) : (
              categories.map((cat) => (
                <Link key={cat.id} href={`/category/${cat.slug}`}>
                  <button
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === cat.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {cat.name}
                  </button>
                </Link>
              ))
            )}
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

      {/* Footer */}
      <Footer />
    </div>
  )
}
