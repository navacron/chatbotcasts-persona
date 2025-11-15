import { MessageCircle } from 'lucide-react'

interface ConversationMessageProps {
  message: {
    persona: string
    name: string
    message: string
    timestamp: string
  }
  isActive: boolean
  isHighlighted: boolean
}

const PERSONA_DETAILS: any = {
  'andrew-ng': { color: 'from-blue-500 to-blue-600', avatar: '🤖' },
  'elon-musk': { color: 'from-orange-500 to-red-600', avatar: '⚡' },
  'sam-altman': { color: 'from-purple-500 to-pink-600', avatar: '🧠' },
  'jane-goodall': { color: 'from-green-500 to-emerald-600', avatar: '🌍' },
  'bill-gates': { color: 'from-cyan-500 to-blue-600', avatar: '💡' },
  'host': { color: 'from-slate-500 to-slate-600', avatar: '🎙️' },
}

export default function ConversationMessage({
  message,
  isActive,
  isHighlighted,
}: ConversationMessageProps) {
  const detail = PERSONA_DETAILS[message.persona]

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border transition-all duration-200
        ${
          isActive
            ? 'bg-primary/10 border-primary shadow-lg scale-105'
            : isHighlighted
              ? 'bg-card border-border'
              : 'bg-background border-border/30 opacity-60'
        }
      `}
    >
      <div className="flex gap-3">
        <div
          className={`
            h-10 w-10 rounded-full flex items-center justify-center text-lg flex-shrink-0
            bg-gradient-to-br ${detail?.color || 'from-slate-500 to-slate-600'}
          `}
        >
          {detail?.avatar}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1">
            <span className="font-semibold text-sm text-foreground">
              {message.name}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {message.timestamp}
            </span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed break-words">
            {message.message}
          </p>
        </div>
      </div>
    </div>
  )
}
