'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Edit2, Trash2, Check, X } from 'lucide-react'
import { useUser } from '@clerk/nextjs'

const HUMAN_PERSONA_ID = "human"

interface ChatMessageProps {
  message: {
    id: number
    persona: string
    name: string
    message: string
    timestamp: Date
    citations?: string[]
  }
  personaDetails: any
  onEdit?: (messageId: number, newText: string) => void
  onDelete?: (messageId: number) => void
}

export default function ChatMessage({
  message,
  personaDetails,
  onEdit,
  onDelete,
}: ChatMessageProps) {
  const { user } = useUser()
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(message.message)
  const isHuman = message.persona === HUMAN_PERSONA_ID

  const timeString = message.timestamp.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  const handleSaveEdit = () => {
    if (onEdit && editText.trim()) {
      onEdit(message.id, editText)
      setIsEditing(false)
    }
  }

  const handleCancelEdit = () => {
    setEditText(message.message)
    setIsEditing(false)
  }

  // Render message text and turn [1], [2], ... into clickable citation links
  const renderMessageWithCitations = () => {
    const text = editText
    const citations = message.citations || []
    const parts: (string | JSX.Element)[] = []

    const regex = /\[(\d+)\]/g
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index

      // Push text before the citation
      if (matchIndex > lastIndex) {
        parts.push(text.slice(lastIndex, matchIndex))
      }

      const citationNumber = parseInt(match[1], 10)
      const href = citations[citationNumber - 1]

      if (href) {
        parts.push(
          <a
            key={`msg-${message.id}-cite-${citationNumber}-${matchIndex}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            [{citationNumber}]
          </a>,
        )
      } else {
        // No matching citation URL, keep the raw text
        parts.push(match[0])
      }

      lastIndex = regex.lastIndex
    }

    // Push any remaining text after the last citation
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts
  }

  return (
    <div className="flex gap-3 group">
      <div
        className={`h-8 w-8 rounded-full bg-gradient-to-br ${personaDetails.color} flex items-center justify-center text-sm flex-shrink-0 overflow-hidden`}
      >
        {isHuman && user?.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={user.fullName || "You"}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span>{personaDetails.avatar}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{personaDetails.name}</span>
            <span className="text-xs text-muted-foreground">{timeString}</span>
          </div>
          <div className="hidden group-hover:flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="h-6 w-6 p-0"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete?.(message.id)}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {isEditing ? (
          <div className="mt-2 space-y-2">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full p-2 border border-border rounded text-sm bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveEdit}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <Check className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/80 mt-1 break-words">
            {renderMessageWithCitations()}
          </p>
        )}
      </div>
    </div>
  )
}
