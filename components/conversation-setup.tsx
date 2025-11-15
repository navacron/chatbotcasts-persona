'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import PersonaSelector from './persona-selector'
import TurnModeSelector from './turn-mode-selector'
import GuestProfileCreator from './guest-profile-creator'
import { Sparkles } from 'lucide-react'

interface ConversationSetupProps {
  onStart: (data: any) => void
}

export default function ConversationSetup({ onStart }: ConversationSetupProps) {
  const [topic, setTopic] = useState('')
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([])
  const [turnMode, setTurnMode] = useState<'manual' | 'alternating' | 'round-robin'>('manual')
  const [turnCount, setTurnCount] = useState<number>(3)
  const [guestProfile, setGuestProfile] = useState<any>(null)
  const [showGuestCreator, setShowGuestCreator] = useState(false)

  const handleStart = () => {
    const allPersonas = [...selectedPersonas]
    if (guestProfile) {
      allPersonas.push(guestProfile.id)
    }

    if (topic.trim() && allPersonas.length >= 2) {
      onStart({
        topic,
        personas: allPersonas,
        turnMode,
        turnCount: turnMode === 'manual' ? 1 : turnCount,
        guestProfile: guestProfile,
      })
    }
  }

  const isValid = topic.trim() && selectedPersonas.length >= 2 && (!showGuestCreator || guestProfile)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-white">
      <div className="w-full max-w-3xl space-y-12">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">ChatBotCasts</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Create engaging conversations between AI personas on any topic. Perfect for exploring ideas from multiple perspectives.
          </p>
        </div>

        {/* Setup Form */}
        <div className="space-y-8 bg-white border border-border rounded-xl p-8">
          {/* Topic Input */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-foreground">
              Conversation Topic
            </label>
            <Input
              placeholder="e.g., The future of artificial intelligence"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-12 text-base bg-white border-border/50 text-foreground placeholder:text-muted-foreground/60"
            />
            <p className="text-xs text-muted-foreground">
              What would you like the personas to discuss?
            </p>
          </div>

          {/* Persona Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">
                Select Personas ({selectedPersonas.length + (guestProfile ? 1 : 0)})
              </label>
              <span className="text-xs text-muted-foreground">
                Minimum 2 personas required
              </span>
            </div>
            <PersonaSelector
              selected={selectedPersonas}
              onChange={setSelectedPersonas}
            />
          </div>

          {showGuestCreator && (
            <GuestProfileCreator
              onSave={setGuestProfile}
              onCancel={() => {
                setShowGuestCreator(false)
                setGuestProfile(null)
              }}
              existingProfile={guestProfile}
            />
          )}

          {!showGuestCreator && (
            <Button
              variant="outline"
              onClick={() => setShowGuestCreator(true)}
              className="w-full border-dashed"
            >
              + Add Custom Guest Persona
            </Button>
          )}

          {guestProfile && (
            <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground">{guestProfile.name}</p>
                  <p className="text-sm text-muted-foreground">{guestProfile.title}</p>
                </div>
                <button
                  onClick={() => setShowGuestCreator(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Edit
                </button>
              </div>
            </div>
          )}

          {/* Turn Mode Selection */}
          <div className="space-y-4">
            <label className="text-sm font-semibold text-foreground">
              Conversation Mode
            </label>
            <TurnModeSelector
              mode={turnMode}
              onModeChange={setTurnMode}
              turnCount={turnCount}
              onTurnCountChange={setTurnCount}
            />
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStart}
            disabled={!isValid}
            size="lg"
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50"
          >
            Start Conversation
          </Button>
        </div>
      </div>
    </div>
  )
}
