'use client'

import { useState, useEffect } from 'react'
import { Search, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Header from '@/components/header'
import GuestCard from '@/components/guest-card'
import Link from 'next/link'

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

export default function GuestsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'my' | 'community'>('community')
  const [publicPersonas, setPublicPersonas] = useState<Persona[]>([])
  const [myPersonas, setMyPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Fetch personas from API
  useEffect(() => {
    fetchPersonas()
  }, [searchQuery])

  const fetchPersonas = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/personas?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      
      if (response.ok) {
        setPublicPersonas(data.publicPersonas || [])
        setMyPersonas(data.myPersonas || [])
        setIsAuthenticated(data.isAuthenticated)
      }
    } catch (error) {
      console.error('[v0] Error fetching personas:', error)
    } finally {
      setLoading(false)
    }
  }

  const displayedPersonas = activeTab === 'my' ? myPersonas : publicPersonas

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

        {/* Guest Grid with real data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">Loading guests...</p>
            </div>
          ) : displayedPersonas.length > 0 ? (
            displayedPersonas.map((persona) => (
              <GuestCard
                key={persona.id}
                guest={{
                  id: persona.id,
                  name: persona.name,
                  title: persona.prompt?.substring(0, 100) || 'AI Persona',
                  author: activeTab === 'my' ? 'You' : 'Community',
                  uses: 0,
                  rating: 4.5,
                }}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">
                {activeTab === 'my' && !isAuthenticated
                  ? 'Sign in to view your personas'
                  : 'No guests found matching your search.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
