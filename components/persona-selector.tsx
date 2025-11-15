'use client'

import { useState } from 'react'
import { Check, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Persona {
  id: string
  name: string
  title: string
  avatar: string
  color: string
}

const POPULAR_PERSONAS: Persona[] = [
  {
    id: 'andrew-ng',
    name: 'Andrew Ng',
    title: 'AI Researcher & Educator',
    avatar: '🤖',
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'elon-musk',
    name: 'Elon Musk',
    title: 'Entrepreneur & Visionary',
    avatar: '⚡',
    color: 'from-orange-500 to-red-600',
  },
  {
    id: 'sam-altman',
    name: 'Sam Altman',
    title: 'AI Industry Leader',
    avatar: '🧠',
    color: 'from-purple-500 to-pink-600',
  },
]

const RECENTLY_USED_PERSONAS: Persona[] = [
  {
    id: 'jane-goodall',
    name: 'Jane Goodall',
    title: 'Primatologist & Conservationist',
    avatar: '🌍',
    color: 'from-green-500 to-emerald-600',
  },
  {
    id: 'bill-gates',
    name: 'Bill Gates',
    title: 'Philanthropist & Tech Pioneer',
    avatar: '💡',
    color: 'from-cyan-500 to-blue-600',
  },
]

const HOST_PERSONA: Persona = {
  id: 'host',
  name: 'ChatBotCast Host',
  title: 'Moderator',
  avatar: '🎙️',
  color: 'from-slate-500 to-slate-600',
}

const AVAILABLE_PERSONAS: Persona[] = [
  ...POPULAR_PERSONAS,
  ...RECENTLY_USED_PERSONAS,
  HOST_PERSONA,
]

interface PersonaSelectorProps {
  selected: string[]
  onChange: (selected: string[]) => void
}

export default function PersonaSelector({
  selected,
  onChange,
}: PersonaSelectorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((p) => p !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const filteredPersonas = AVAILABLE_PERSONAS.filter(
    (persona) =>
      persona.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      persona.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredPopular = filteredPersonas.filter((p) =>
    POPULAR_PERSONAS.some((pp) => pp.id === p.id)
  )
  const filteredRecent = filteredPersonas.filter((p) =>
    RECENTLY_USED_PERSONAS.some((pp) => pp.id === p.id)
  )
  const filteredHost = filteredPersonas.filter((p) => p.id === 'host')

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
                    bg-gradient-to-br ${persona.color}
                  `}
                >
                  {persona.avatar}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <div className="font-semibold text-foreground text-sm">
                  {persona.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {persona.title}
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

      {filteredPersonas.length > 0 ? (
        <div className="space-y-6">
          {filteredPopular.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Popular Personas</h3>
              {renderPersonaGrid(filteredPopular)}
            </div>
          )}

          {filteredRecent.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Recently Used</h3>
              {renderPersonaGrid(filteredRecent)}
            </div>
          )}

          {filteredHost.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Host</h3>
              {renderPersonaGrid(filteredHost)}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No personas found matching "{searchQuery}"
        </div>
      )}
    </div>
  )
}
