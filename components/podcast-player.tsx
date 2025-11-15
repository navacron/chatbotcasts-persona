'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, Volume2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ConversationMessage from './conversation-message'

const MOCK_CONVERSATION = [
  {
    persona: 'host',
    name: 'ChatBotCast Host',
    message: "Welcome to ChatBotCasts! Today we're discussing the impact of artificial intelligence on society. Let's start with our expert panelists.",
    timestamp: '0:00',
  },
  {
    persona: 'andrew-ng',
    name: 'Andrew Ng',
    message: "Thanks for having me. I think AI is fundamentally transforming how we solve problems. The key is ensuring we develop it responsibly.",
    timestamp: '0:15',
  },
  {
    persona: 'elon-musk',
    name: 'Elon Musk',
    message: "I agree on the responsibility part, but I'm more focused on the speed of development. We need to move fast while maintaining safety.",
    timestamp: '0:35',
  },
  {
    persona: 'sam-altman',
    name: 'Sam Altman',
    message: "Both points are valid. I think the intersection is critical - we can't slow down innovation for safety, nor can we sacrifice safety for speed.",
    timestamp: '0:55',
  },
]

interface PodcastPlayerProps {
  data: any
}

export default function PodcastPlayer({ data }: PodcastPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(75)
  const [currentMessage, setCurrentMessage] = useState(0)

  useEffect(() => {
    if (!isPlaying) return

    const interval = setInterval(() => {
      setProgress((p) => {
        const next = p + 1
        if (next >= 100) {
          setIsPlaying(false)
          return 0
        }
        if (next % 25 === 0) {
          setCurrentMessage((m) => Math.min(m + 1, MOCK_CONVERSATION.length - 1))
        }
        return next
      })
    }, 500)

    return () => clearInterval(interval)
  }, [isPlaying])

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          {data?.topic}
        </h2>
        <p className="text-muted-foreground">
          {data?.personas.length} personas participating
        </p>
      </div>

      {/* Player Controls */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-6">
        {/* Playback Controls */}
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-14 w-14 rounded-full bg-gradient-to-r from-primary to-accent hover:opacity-90 flex items-center justify-center flex-shrink-0"
          >
            {isPlaying ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 ml-0.5" />
            )}
          </Button>

          {/* Progress Bar */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground font-mono">
                {Math.floor(progress / 100 * 100)}s
              </span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                100s
              </span>
            </div>
          </div>

          {/* Volume Control */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Volume2 className="h-5 w-5 text-muted-foreground" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-20 h-2 bg-muted rounded-full accent-primary cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Conversation Feed */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Conversation
          </h3>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {MOCK_CONVERSATION.map((msg, idx) => (
            <ConversationMessage
              key={idx}
              message={msg}
              isActive={idx === currentMessage && isPlaying}
              isHighlighted={idx <= currentMessage}
            />
          ))}
        </div>
      </div>

      {/* Participant List */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Participants
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data?.personas.map((personaId: string) => {
            const persona = ['andrew-ng', 'elon-musk', 'sam-altman', 'jane-goodall', 'bill-gates', 'host'].find(
              (p) => p === personaId
            )
            const details: any = {
              'andrew-ng': { name: 'Andrew Ng', title: 'AI Researcher', avatar: '🤖' },
              'elon-musk': { name: 'Elon Musk', title: 'Entrepreneur', avatar: '⚡' },
              'sam-altman': { name: 'Sam Altman', title: 'AI Leader', avatar: '🧠' },
              'jane-goodall': { name: 'Jane Goodall', title: 'Conservationist', avatar: '🌍' },
              'bill-gates': { name: 'Bill Gates', title: 'Philanthropist', avatar: '💡' },
              'host': { name: 'ChatBotCast Host', title: 'Moderator', avatar: '🎙️' },
            }

            const detail = details[personaId]

            return (
              <div
                key={personaId}
                className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border/50"
              >
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-lg">
                  {detail.avatar}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-sm text-foreground">
                    {detail.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {detail.title}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
