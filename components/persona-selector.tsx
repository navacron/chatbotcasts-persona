'use client'

import { useState, useEffect } from 'react'
import { Check, Search, User } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useUser, SignUpButton } from '@clerk/nextjs'

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

const getPersonaTitle = (prompt: string): string => {
  // Try to extract first sentence or first 50 chars
  const firstSentence = prompt.split('.')[0]
  return firstSentence.length > 50 
    ? firstSentence.substring(0, 50) + '...'
    : firstSentence
}

// Helper function to get avatar emoji based on name
const getPersonaAvatar = (name: string): string => {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('andrew')) return '🤖'
  if (lowerName.includes('elon')) return '⚡'
  if (lowerName.includes('sam')) return '🧠'
  if (lowerName.includes('jane')) return '🌍'
  if (lowerName.includes('bill')) return '💡'
  if (lowerName.includes('host')) return '🎙️'
  return '👤'
}

// Helper function to get color gradient based on name
const getPersonaColor = (name: string): string => {
  const lowerName = name.toLowerCase()
  if (lowerName.includes('andrew')) return 'from-blue-500 to-blue-600'
  if (lowerName.includes('elon')) return 'from-orange-500 to-red-600'
  if (lowerName.includes('sam')) return 'from-purple-500 to-pink-600'
  if (lowerName.includes('jane')) return 'from-green-500 to-emerald-600'
  if (lowerName.includes('bill')) return 'from-cyan-500 to-blue-600'
  if (lowerName.includes('host')) return 'from-slate-500 to-slate-600'
  return 'from-gray-500 to-gray-600'
}
// </CHANGE>

interface PersonaSelectorProps {
  selected: string[]
  onChange: (selected: string[]) => void
}

export default function PersonaSelector({
  selected,
  onChange,
}: PersonaSelectorProps) {
  const { user, isLoaded: isUserLoaded } = useUser()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [publicPersonas, setPublicPersonas] = useState<Persona[]>([])
  const [myPersonas, setMyPersonas] = useState<Persona[]>([])
  const [loading, setLoading] = useState(true)
  
  // Human persona ID constant
  const HUMAN_PERSONA_ID = 'human'
  const isLoggedIn = isUserLoaded && !!user

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
      }
    } catch (error) {
      console.error('[v0] Error fetching personas:', error)
    } finally {
      setLoading(false)
    }
  }
  // </CHANGE>

  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((p) => p !== id))
    } else {
      onChange([...selected, id])
    }
  }
  
  const handleToggleHuman = () => {
    handleToggle(HUMAN_PERSONA_ID)
  }

  const hostPersonas = publicPersonas.filter(p => p.name.toLowerCase().includes('host'))
  // Combine all non-host personas (public and user's) and limit to 20
  const allNonHostPersonas = [
    ...myPersonas,
    ...publicPersonas.filter(p => !p.name.toLowerCase().includes('host'))
  ]
  // Remove duplicates (in case a persona appears in both lists)
  const uniquePersonas = allNonHostPersonas.filter((persona, index, self) => 
    index === self.findIndex(p => p.id === persona.id)
  )
  const guestPersonas = uniquePersonas.slice(0, 20)
  // </CHANGE>

  const renderPersonaGrid = (personas: Persona[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {personas.map((persona) => {
        const isSelected = selected.includes(persona.id)

        return (
          <button
            key={persona.id}
            onClick={() => handleToggle(persona.id)}
            onMouseEnter={() => setHoveredId(persona.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="relative group"
          >
            <div
              className={`
                h-24 px-4 py-3 rounded-lg border-2 transition-all duration-200
                flex items-center gap-3
                ${
                  isSelected
                    ? 'border-primary bg-primary/10'
                    : 'border-border/50 bg-background hover:border-border'
                }
                ${hoveredId === persona.id ? 'shadow-lg' : ''}
              `}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div
                  className={`
                    h-12 w-12 rounded-full flex items-center justify-center text-xl
                    bg-gradient-to-br ${getPersonaColor(persona.name)}
                  `}
                >
                  {getPersonaAvatar(persona.name)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <div className="font-semibold text-foreground text-sm">
                  {persona.name}
                </div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  {getPersonaTitle(persona.prompt)}
                </div>
              </div>

              {/* Checkbox */}
              {isSelected && (
                <div className="flex-shrink-0">
                  <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search personas by name or title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-white border-border/50 text-foreground placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Human Persona Option - Only show if logged in */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">You</h3>
        {isLoggedIn ? (
          <button
            onClick={handleToggleHuman}
            onMouseEnter={() => setHoveredId(HUMAN_PERSONA_ID)}
            onMouseLeave={() => setHoveredId(null)}
            className="relative group w-full"
          >
            <div
              className={`
                h-24 px-4 py-3 rounded-lg border-2 transition-all duration-200
                flex items-center gap-3
                ${
                  selected.includes(HUMAN_PERSONA_ID)
                    ? 'border-primary bg-primary/10'
                    : 'border-border/50 bg-background hover:border-border'
                }
                ${hoveredId === HUMAN_PERSONA_ID ? 'shadow-lg' : ''}
              `}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div
                  className={`
                    h-12 w-12 rounded-full flex items-center justify-center text-xl
                    bg-gradient-to-br from-indigo-500 to-purple-600
                  `}
                >
                  {user?.imageUrl ? (
                    <img 
                      src={user.imageUrl} 
                      alt={user.fullName || 'You'} 
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-white" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <div className="font-semibold text-foreground text-sm">
                  {user?.fullName || user?.firstName || 'You'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Participate in the conversation as yourself
                </div>
              </div>

              {/* Checkbox */}
              {selected.includes(HUMAN_PERSONA_ID) && (
                <div className="flex-shrink-0">
                  <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                </div>
              )}
            </div>
          </button>
        ) : (
          <div className="h-24 px-4 py-3 rounded-lg border-2 border-border/50 bg-background flex items-center gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full flex items-center justify-center text-xl bg-gradient-to-br from-indigo-500 to-purple-600">
                <User className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 text-left">
              <div className="font-semibold text-foreground text-sm mb-1">
                Sign up to participate
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                Join the conversation as yourself
              </div>
              <SignUpButton mode="modal" fallbackRedirectUrl="/create">
                <button className="text-xs px-3 py-1.5 rounded-md bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 transition-opacity">
                  Sign Up
                </button>
              </SignUpButton>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading personas...
        </div>
      ) : (guestPersonas.length > 0 || hostPersonas.length > 0) ? (
        <div className="space-y-6">
          {guestPersonas.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Guests {guestPersonas.length < uniquePersonas.length && `(Showing ${guestPersonas.length} of ${uniquePersonas.length})`}
              </h3>
              {renderPersonaGrid(guestPersonas)}
            </div>
          )}

          {hostPersonas.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Host</h3>
              {renderPersonaGrid(hostPersonas)}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No personas found matching "{searchQuery}"
        </div>
      )}
      {/* </CHANGE> */}
    </div>
  )
}
