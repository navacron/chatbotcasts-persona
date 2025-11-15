'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { Zap, Clock, Share2, Users, TrendingUp, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Header from '@/components/header'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const USER_DATA = {
  name: 'Alex Johnson',
  email: 'alex@example.com',
  credits: 25,
  totalCreditsUsed: 150,
  joinDate: 'Jan 15, 2025',
  avatar: '👤',
}

const MOCK_MY_CONVERSATIONS = [
  {
    id: 1,
    title: 'AI Ethics Debate',
    createdAt: '2 days ago',
    status: 'published',
    views: 342,
    credits: 5,
    topic: 'The Future of AI Ethics and Responsibility',
    personas: ['host', 'andrew-ng', 'elon-musk'],
    turnMode: 'alternating',
    numTurns: 3,
    messages: [
      {
        id: 1,
        persona: 'host',
        name: 'ChatBotCast Host',
        message: "Welcome everyone! Today we're discussing AI ethics. Let's dive in.",
        timestamp: new Date(),
      },
      {
        id: 2,
        persona: 'andrew-ng',
        name: 'Andrew Ng',
        message: 'Ethics in AI is crucial. We need robust frameworks to ensure responsible development.',
        timestamp: new Date(),
      },
      {
        id: 3,
        persona: 'elon-musk',
        name: 'Elon Musk',
        message: 'I agree, but we also need to move fast. The key is finding the right balance.',
        timestamp: new Date(),
      },
    ],
  },
  {
    id: 2,
    title: 'Future of Work Discussion',
    createdAt: '1 week ago',
    status: 'draft',
    views: 0,
    credits: 0,
    topic: 'How AI Will Transform the Workplace',
    personas: ['host', 'bill-gates'],
    turnMode: 'manual',
    numTurns: 0,
    messages: [
      {
        id: 1,
        persona: 'host',
        name: 'ChatBotCast Host',
        message: 'Welcome! Today we explore how AI will change work.',
        timestamp: new Date(),
      },
    ],
  },
  {
    id: 3,
    title: 'Climate Action Strategies',
    createdAt: '2 weeks ago',
    status: 'published',
    views: 1205,
    credits: 15,
    topic: 'Sustainable Solutions for Climate Change',
    personas: ['host', 'jane-goodall', 'bill-gates'],
    turnMode: 'round-robin',
    numTurns: 2,
    messages: [
      {
        id: 1,
        persona: 'host',
        name: 'ChatBotCast Host',
        message: 'Welcome to this important discussion about climate action.',
        timestamp: new Date(),
      },
      {
        id: 2,
        persona: 'jane-goodall',
        name: 'Jane Goodall',
        message: 'Nature provides us with all the solutions we need if we listen carefully.',
        timestamp: new Date(),
      },
      {
        id: 3,
        persona: 'bill-gates',
        name: 'Bill Gates',
        message: 'Innovation and technology are key drivers for sustainable change.',
        timestamp: new Date(),
      },
    ],
  },
]

const MOCK_MY_GUESTS = [
  {
    id: 1,
    name: 'Dr. Tech Visionary',
    title: 'AI Expert',
    created: '1 week ago',
    uses: 42,
    rating: 4.8,
  },
  {
    id: 2,
    name: 'Sustainability Leader',
    title: 'Environmental Scientist',
    created: '3 weeks ago',
    uses: 18,
    rating: 4.6,
  },
]

const STATS = [
  { label: 'Conversations', value: 3, icon: Share2 },
  { label: 'Custom Guests', value: 2, icon: Users },
  { label: 'Total Views', value: '1.5K', icon: TrendingUp },
  { label: 'Credits Remaining', value: USER_DATA.credits, icon: Zap },
]

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'conversations' | 'guests'>('conversations')
  const router = useRouter()

  const handleOpenConversation = (conversation: any) => {
    const encodedData = encodeURIComponent(JSON.stringify(conversation))
    router.push(`/create?conversation=${encodedData}`)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="space-y-8 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">Welcome back, {USER_DATA.name}!</h1>
            <p className="text-muted-foreground">Manage your conversations and guest personas</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="bg-white border border-border rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
              )
            })}
          </div>

          {USER_DATA.credits < 50 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-4">
              <Zap className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">Credits Running Low</h3>
                <p className="text-sm text-blue-700 mb-3">
                  You have {USER_DATA.credits} credits remaining. Purchase more to keep creating conversations.
                </p>
                <Link href="/billing">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Buy Credits
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 border-b border-border">
              <button
                onClick={() => setActiveTab('conversations')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'conversations'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                My Conversations
              </button>
              <button
                onClick={() => setActiveTab('guests')}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === 'guests'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                My Guests
              </button>
            </div>
            <Link href="/create">
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                New Conversation
              </Button>
            </Link>
          </div>

          {activeTab === 'conversations' && (
            <div className="space-y-4">
              {MOCK_MY_CONVERSATIONS.length > 0 ? (
                MOCK_MY_CONVERSATIONS.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleOpenConversation(conv)}
                    className="bg-white border border-border rounded-lg p-6 flex items-center justify-between hover:shadow-md hover:border-primary cursor-pointer transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-foreground">{conv.title}</h3>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            conv.status === 'published'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {conv.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {conv.createdAt}
                        </div>
                        {conv.views > 0 && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {conv.views} views
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {conv.credits > 0 && (
                          <div className="flex items-center gap-1 text-accent font-semibold">
                            <Zap className="h-4 w-4" />
                            +{conv.credits}
                          </div>
                        )}
                      </div>
                      <Button size="sm" variant="outline" onClick={(e) => e.stopPropagation()}>
                        View
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-border">
                  <p className="text-muted-foreground mb-4">No conversations yet</p>
                  <Link href="/create">
                    <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                      Create First Conversation
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === 'guests' && (
            <div className="space-y-4">
              {MOCK_MY_GUESTS.length > 0 ? (
                MOCK_MY_GUESTS.map((guest) => (
                  <div
                    key={guest.id}
                    className="bg-white border border-border rounded-lg p-6 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground mb-1">{guest.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{guest.title}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Created {guest.created}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {guest.uses} uses
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-foreground">★ {guest.rating}</div>
                      </div>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-border">
                  <p className="text-muted-foreground mb-4">No custom guests yet</p>
                  <Link href="/guests/create">
                    <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                      Create First Guest
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
