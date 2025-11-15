'use client'

import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Header from '@/components/header'
import GuestCard from '@/components/guest-card'
import Link from 'next/link'

const MOCK_MY_GUESTS = [
  {
    id: 'my-guest-1',
    name: 'Dr. Tech Expert',
    title: 'AI Researcher',
    author: 'You',
    uses: 45,
    rating: 4.8,
  },
]

const MOCK_COMMUNITY_GUESTS = [
  {
    id: 'guest1',
    name: 'Dr. Jane Smith',
    title: 'Climate Scientist',
    author: 'Alex Chen',
    uses: 234,
    rating: 4.9,
  },
  {
    id: 'guest2',
    name: 'Marketing Guru',
    title: 'Growth Strategist',
    author: 'Sarah Mitchell',
    uses: 156,
    rating: 4.7,
  },
  {
    id: 'guest3',
    name: 'Philosophy Prof',
    title: 'Ethics Expert',
    author: 'Emma Wilson',
    uses: 98,
    rating: 4.6,
  },
]

export default function GuestsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'my' | 'community'>('community')

  const filteredGuests = (activeTab === 'my' ? MOCK_MY_GUESTS : MOCK_COMMUNITY_GUESTS).filter(
    (guest) =>
      guest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guest.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        {/* Header */}
        <div className="space-y-6 mb-12">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground">Manage Guests</h1>
              <p className="text-muted-foreground">Create and manage custom AI personas</p>
            </div>
            {activeTab === 'my' && (
              <Link href="/guests/create">
                <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  <Plus className="h-4 w-4 mr-2" />
                  New Guest
                </Button>
              </Link>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => setActiveTab('community')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'community'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Community Guests
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'my'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              My Guests
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search guests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white border-border"
            />
          </div>
        </div>

        {/* Guest Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuests.length > 0 ? (
            filteredGuests.map((guest) => <GuestCard key={guest.id} guest={guest} />)
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No guests found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
