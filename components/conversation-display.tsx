"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Eye, User, MessageSquarePlus, ExternalLink } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import PlayAllControl from "@/components/play-all-control"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"

interface Message {
  id: number
  role: string
  content: string
  personaId: string
  citations: string[]
  timestamp: string
  audio?: string
}

interface Persona {
  id: string
  name: string
  prompt?: string
}

interface Category {
  id: string
  name: string
  slug: string
}

interface ConversationData {
  id: string
  title: string
  description?: string
  topic?: string
  feature_image?: string | null
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
  category?: Category | null
}

export default function ConversationDisplay({ conversation, personas, user, category }: ConversationDisplayProps) {
  const { user: clerkUser, isLoaded } = useUser()
  const isLoggedIn = isLoaded && !!clerkUser
  const router = useRouter()

  const messages = conversation.data?.messages || []
  const personaMap = new Map(personas.map((p) => [p.id, p]))
  const hasAudio = messages.some((msg) => msg.audio)

  const getPersonaColor = (personaId: string) => {
    const persona = personaMap.get(personaId)
    if (!persona) return "bg-gray-500"

    const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"]
    const index = persona.name.charCodeAt(0) % colors.length
    return colors[index]
  }

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

  const getFirstYouTubeVideoId = () => {
    for (const message of messages) {
      if (message.citations && message.citations.length > 0) {
        for (const citation of message.citations) {
          const match = citation.match(
            /(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
          )
          if (match && match[1]) {
            return match[1]
          }
        }
      }
    }
    return null
  }

  const youtubeVideoId = getFirstYouTubeVideoId()

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4 text-balance">{conversation.title}</h1>

        {category && (
          <div className="mb-4">
            <Link
              href={`/category/${category.slug}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              <Badge variant="secondary" className="px-3 py-1">
                {category.name}
              </Badge>
            </Link>
          </div>
        )}

        {conversation.feature_image && (
          <div className="mb-6 rounded-lg overflow-hidden">
            <Image
              src={conversation.feature_image || "/placeholder.svg"}
              alt={conversation.title}
              width={896}
              height={504}
              className="w-full h-auto"
              priority
            />
          </div>
        )}

        {conversation.description && (
          <div className="bg-muted/50 rounded-lg p-6 mb-6">
            <div
              className="text-lg leading-relaxed text-pretty prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: conversation.description }}
            />
          </div>
        )}

        {youtubeVideoId && (
          <div className="mb-8">
            <div className="relative w-full rounded-lg overflow-hidden" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {hasAudio && (
          <div className="mb-6">
            <PlayAllControl messages={messages} />
          </div>
        )}

        {/* Meta information */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>{clerkUser?.firstName || clerkUser?.lastName || "Anonymous"}</span>
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
                    <div
                      className="prose prose-sm max-w-none leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: msg.content }}
                    />

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
