"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Eye, User, MessageSquarePlus, ExternalLink } from "lucide-react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface Message {
  id: number
  role: string // Persona name
  content: string
  personaId: string
  citations: string[]
  timestamp: string
}

interface Persona {
  id: string
  name: string
  prompt?: string
}

interface ConversationData {
  id: string
  title: string
  description?: string
  topic?: string
  data: {
    title?: string
    content?: string
    slug?: string
    allPersonaIds?: string[]
    currentPersonaId?: string
    messages: Message[]
  }
  view_count: number
  created_at: string
  updated_at: string
}

interface ConversationDisplayProps {
  conversation: ConversationData
  personas: Persona[]
  user: { display_name?: string; email?: string } | null
}

export default function ConversationDisplay({ conversation, personas, user }: ConversationDisplayProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setIsLoggedIn(!!user)
    }
    checkAuth()
  }, [])

  const messages = conversation.data?.messages || []
  const personaMap = new Map(personas.map((p) => [p.id, p]))

  // Helper to get persona avatar color
  const getPersonaColor = (personaId: string) => {
    const persona = personaMap.get(personaId)
    if (!persona) return "bg-gray-500"

    const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"]
    const index = persona.name.charCodeAt(0) % colors.length
    return colors[index]
  }

  // Helper to get persona initials
  const getPersonaInitials = (personaId: string) => {
    const persona = personaMap.get(personaId)
    if (!persona) return "?"

    return persona.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const handleExtendConversation = () => {
    router.push(`/create?conversationId=${conversation.id}`)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-balance">{conversation.title}</h1>

        {conversation.description && (
          <div className="bg-muted/50 rounded-lg p-6 mb-6">
            <p className="text-lg leading-relaxed text-pretty">{conversation.description}</p>
          </div>
        )}

        {/* Meta information */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Anonymous</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formatDate(conversation.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            <span>{conversation.view_count || 0} views</span>
          </div>
        </div>

        {/* Participants */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold mb-3">Participants</h2>
          <div className="flex flex-wrap gap-2">
            {personas.map((persona) => (
              <Badge key={persona.id} variant="secondary" className="px-3 py-1">
                {persona.name}
              </Badge>
            ))}
          </div>
        </div>

        {/* Extend Conversation button for logged-in users */}
        {isLoggedIn && (
          <div className="mb-8">
            <Button
              onClick={handleExtendConversation}
              className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
            >
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              Extend Conversation
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-1">
        {messages.map((msg, index) => {
          const persona = personaMap.get(msg.personaId)
          const isFirstMessageFromPersona = index === 0 || messages[index - 1].personaId !== msg.personaId

          return (
            <div key={msg.id}>
              {/* Show persona name badge when speaker changes */}
              {isFirstMessageFromPersona && (
                <div className="flex items-center gap-3 mb-3 mt-6">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={getPersonaColor(msg.personaId)}>
                      {getPersonaInitials(msg.personaId)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-sm">{persona?.name || msg.role}</span>
                </div>
              )}

              {/* Message card with indentation */}
              <div className="ml-11">
                <Card className="bg-muted/30 border-0 shadow-none">
                  <div className="p-6">
                    <div className="prose prose-sm max-w-none leading-relaxed whitespace-pre-wrap">{msg.content}</div>

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Sources:</p>
                        <div className="flex flex-wrap gap-2">
                          {msg.citations.map((citation, idx) => (
                            <a
                              key={idx}
                              href={citation}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />[{idx + 1}]
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )
        })}
      </div>

      {messages.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No messages in this conversation yet.</p>
        </Card>
      )}
    </div>
  )
}
