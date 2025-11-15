'use client'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface TurnModeSelectorProps {
  mode: 'manual' | 'alternating' | 'round-robin'
  onModeChange: (mode: 'manual' | 'alternating' | 'round-robin') => void
  turnCount: number
  onTurnCountChange: (count: number) => void
}

export default function TurnModeSelector({
  mode,
  onModeChange,
  turnCount,
  onTurnCountChange,
}: TurnModeSelectorProps) {
  const modes = [
    {
      id: 'manual',
      title: 'Manual Mode',
      description: 'You select who speaks next after each message',
      icon: '🎯',
    },
    {
      id: 'alternating',
      title: 'Alternating Mode',
      description: 'Conversation alternates between host and guest',
      icon: '↔️',
    },
    {
      id: 'round-robin',
      title: 'Round-Robin Mode',
      description: 'Personas take turns in sequence',
      icon: '🔄',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id as 'manual' | 'alternating' | 'round-robin')}
            className={`
              p-4 rounded-lg border-2 transition-all text-left
              ${
                mode === m.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border/50 bg-background hover:border-border'
              }
            `}
          >
            <div className="text-2xl mb-2">{m.icon}</div>
            <div className="font-semibold text-sm text-foreground">{m.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{m.description}</div>
          </button>
        ))}
      </div>

      {/* Turn Count Configuration */}
      {mode !== 'manual' && (
        <div className="space-y-2 bg-background border border-border/50 rounded-lg p-4">
          <label className="text-sm font-semibold text-foreground">
            Number of Turns Per Cycle
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            {mode === 'alternating'
              ? 'How many times should the host and guest exchange messages?'
              : 'How many times should each persona speak in sequence?'}
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              max="20"
              value={turnCount}
              onChange={(e) => onTurnCountChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 h-10 text-center bg-input border-border/50"
            />
            <span className="text-xs text-muted-foreground">
              turns {mode === 'alternating' ? 'per exchange' : 'per persona'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
