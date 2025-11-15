'use client'

import { useState } from 'react'
import { Search, Zap, Users, Share2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import ConversationCard from '@/components/conversation-card'
import GuestCard from '@/components/guest-card'
import Header from '@/components/header'
import Footer from '@/components/footer'
import Link from 'next/link'

const CATEGORIES = [
  { id: 'tech', name: 'Technology', color: 'from-blue-500 to-blue-600' },
  { id: 'business', name: 'Business', color: 'from-green-500 to-green-600' },
  { id: 'science', name: 'Science', color: 'from-purple-500 to-purple-600' },
  { id: 'philosophy', name: 'Philosophy', color: 'from-pink-500 to-pink-600' },
]

const MOCK_CONVERSATIONS = [
  {
    id: 1,
    title: 'AI Ethics Debate',
    description: 'Andrew Ng and Yann LeCun discuss the ethical implications of AI',
    category: 'tech',
    participants: ['Andrew Ng', 'Yann LeCun'],
    views: 2400,
    rating: 4.8,
    author: 'Alex Chen',
  },
  {
    id: 2,
    title: 'The Future of Work',
    description: 'Discussing remote work, automation, and human productivity',
    category: 'business',
    participants: ['Satya Nadella', 'Tim Cook'],
    views: 1800,
    rating: 4.6,
    author: 'Sarah Mitchell',
  },
  {
    id: 3,
    title: 'Climate Change Solutions',
    description: 'Scientists discuss renewable energy and sustainability',
    category: 'science',
    participants: ['Neil deGrasse Tyson', 'Jane Goodall'],
    views: 3200,
    rating: 4.9,
    author: 'Mike Johnson',
  },
  {
    id: 4,
    title: 'Meaning and Purpose',
    description: 'Exploring existentialism and the meaning of life',
    category: 'philosophy',
    participants: ['Bertrand Russell', 'Simone Weil'],
    views: 1500,
    rating: 4.7,
    author: 'Emma Wilson',
  },
]

const MOCK_GUESTS = [
  {
    id: 'guest1',
    name: 'Dr. Jane Smith',
    title: 'AI Researcher',
    author: 'Alex Chen',
    uses: 234,
    rating: 4.9,
  },
  {
    id: 'guest2',
    name: 'Climate Expert',
    title: 'Environmental Scientist',
    author: 'Sarah Mitchell',
    uses: 156,
    rating: 4.7,
  },
]

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'conversations' | 'guests'>('conversations')

  const filteredConversations = MOCK_CONVERSATIONS.filter((conv) => {
    const matchesSearch = conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = !selectedCategory || conv.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const filteredGuests = MOCK_GUESTS.filter((guest) =>
    guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guest.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-20">
          <div className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                Create AI Conversations
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Generate engaging podcasts and conversations between AI personas. Explore ideas from multiple perspectives.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/create" className="flex-1 sm:flex-none">
                <Button size="lg" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  Create Conversation
                </Button>
              </Link>
              <Link href="/guests" className="flex-1 sm:flex-none">
                <Button size="lg" variant="outline" className="w-full">
                  Explore Guests
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="border-b border-border bg-white/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-accent" />
                <span className="text-sm text-muted-foreground">Free Credits</span>
              </div>
              <p className="text-2xl font-bold text-foreground">10</p>
              <p className="text-xs text-muted-foreground">conversations for new users</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Personas</span>
              </div>
              <p className="text-2xl font-bold text-foreground">50+</p>
              <p className="text-xs text-muted-foreground">built-in and community</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="h-5 w-5 text-green-600" />
                <span className="text-sm text-muted-foreground">Conversations</span>
              </div>
              <p className="text-2xl font-bold text-foreground">12K+</p>
              <p className="text-xs text-muted-foreground">published and shared</p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-orange-600" />
                <span className="text-sm text-muted-foreground">Premium</span>
              </div>
              <p className="text-2xl font-bold text-foreground">Unlimited</p>
              <p className="text-xs text-muted-foreground">after free credits</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex-1">
        {/* Search and Filters */}
        <div className="space-y-6 mb-12">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'conversations' ? "Search conversations..." : "Search guests..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white border-border"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'conversations'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Conversations
            </button>
            <button
              onClick={() => setActiveTab('guests')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'guests'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Community Guests
            </button>
          </div>

          {/* Category Filter - Only show for conversations */}
          {activeTab === 'conversations' && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === null
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-foreground hover:bg-secondary/80'
                }`}
              >
                All Categories
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-secondary/80'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Grid */}
        {activeTab === 'conversations' ? (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">
              {selectedCategory
                ? CATEGORIES.find((c) => c.id === selectedCategory)?.name
                : 'Popular Conversations'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => (
                  <ConversationCard key={conv.id} conversation={conv} />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No conversations found matching your search.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-foreground">
              Community Guests
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGuests.length > 0 ? (
                filteredGuests.map((guest) => (
                  <GuestCard key={guest.id} guest={guest} />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No guests found matching your search.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <Footer />
    </div>
  )
}
