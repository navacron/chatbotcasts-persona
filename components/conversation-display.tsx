"use client"

import React, { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, MessageSquarePlus, ExternalLink, Pencil, ArrowRight, Lightbulb, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import PlayAllControl from "@/components/play-all-control"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { extractUsernameFromEmail } from "@/lib/user-utils"
import SectionNavigation from "@/components/section-navigation"
import InsightsPanel from "@/components/insights-panel"
import type { Verdicts } from "@/lib/verdict-schemas"

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
  slug?: string
  user_id?: string
  title: string
  description?: string
  topic?: string
  feature_image?: string | null
  parent_conversation_id?: string | null
  version?: number
  data: {
    title?: string
    content?: string
    slug?: string
    allPersonaIds?: string[]
    currentPersonaId?: string
    messages: Message[]
    verdicts?: Verdicts
  }
  view_count: number
  created_at: string
  updated_at: string
}

interface ParentConversation {
  id: string
  slug: string
  title: string
  version?: number
}

interface FirstChildConversation {
  slug: string
  title: string
  version?: number
}

interface ConversationDisplayProps {
  conversation: ConversationData
  personas: Persona[]
  user: { display_name?: string; email?: string } | null
  category?: Category | null
  parentConversation?: ParentConversation | null
  firstChildConversation?: FirstChildConversation | null
}

export default function ConversationDisplay({
  conversation,
  personas,
  user,
  category,
  parentConversation = null,
  firstChildConversation = null,
}: ConversationDisplayProps) {
  const { user: clerkUser, isLoaded } = useUser()
  const isLoggedIn = isLoaded && !!clerkUser
  const isOwner = isLoggedIn && !!conversation.user_id && clerkUser?.id === conversation.user_id
  const router = useRouter()

  const messages = conversation.data?.messages || []
  const personaMap = new Map(personas.map((p) => [p.id, p]))
  const hasAudio = messages.some((msg) => msg.audio)
  const slug = conversation.slug ?? ""

  const [verdicts, setVerdicts] = useState<Verdicts | null>(conversation.data?.verdicts ?? null)
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const [insightsError, setInsightsError] = useState<string | null>(null)
  const hasInsights = !!verdicts

  const handleGenerateInsights = async () => {
    setGeneratingInsights(true)
    setInsightsError(null)
    try {
      const res = await fetch("/api/generateVerdicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversation.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to generate insights")
      setVerdicts(json.verdicts as Verdicts)
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : "Failed to generate insights")
    } finally {
      setGeneratingInsights(false)
    }
  }

  const getPersonaColor = (personaId: string) => {
    const persona = personaMap.get(personaId)
    if (!persona) return "bg-gray-500"

    const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"]
    const index = persona.name.charCodeAt(0) % colors.length
    return colors[index]
  }

  const getPersonaInitials = (personaId: string, displayName?: string) => {
    const persona = personaMap.get(personaId)
    const name = persona?.name || displayName
    if (!name || !name.trim()) return "?"

    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
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

  const handleEditPost = () => {
    if (slug) router.push(`/posts/${slug}/edit`)
  }

  // Render message content and convert inline [1], [2], ... into clickable citation links
  const renderMessageWithCitations = (message: Message) => {
    const text = message.content || ""
    const citations = message.citations || []
    const parts: (string | React.ReactElement)[] = []

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

  const formatDescription = (description: string) => {
    // Convert newlines to proper HTML paragraphs and line breaks
    // Split by double newlines for paragraphs, then replace single newlines with <br>
    const paragraphs = description
      .split(/\n\n+/)
      .map((para) => para.trim())
      .filter(Boolean)
      .map((para) => {
        // Replace single newlines within a paragraph with <br>
        const withBreaks = para.replace(/\n/g, "<br>")
        return `<p>${withBreaks}</p>`
      })
      .join("")

    return paragraphs || description.replace(/\n/g, "<br>")
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

  const version = conversation.version ?? 1
  const showLastUpdated =
    conversation.updated_at && conversation.created_at && conversation.updated_at !== conversation.created_at

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Part 2 / Continued from banner */}
      {parentConversation && (
        <div className="mb-4 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
          <span className="font-medium">Part {version}</span>
          <span className="text-muted-foreground mx-2">·</span>
          <span className="text-muted-foreground">Continued from </span>
          <Link href={`/posts/${parentConversation.slug}`} className="text-primary hover:underline font-medium">
            Part {parentConversation.version ?? 1}: {parentConversation.title}
          </Link>
        </div>
      )}

      {/* Section Navigation */}
      <SectionNavigation hasAudio={hasAudio} hasInsights={hasInsights} />

      {/* Summary Section */}
      <section id="summary" className="scroll-mt-24 mb-8">
        {category && (
          <div className="mb-3">
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

        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-balance">{conversation.title}</h1>

        {/* Editorial cast row */}
        {personas.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-3 mb-3">
            {personas.map((persona, idx) => (
              <React.Fragment key={persona.id}>
                {idx > 0 && (
                  <span className="text-sm font-medium text-muted-foreground/60 italic">vs</span>
                )}
                <div className="flex items-center gap-2">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className={getPersonaColor(persona.id)}>
                      {getPersonaInitials(persona.id, persona.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-base">{persona.name}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Compact byline */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground mb-6">
          <span>{extractUsernameFromEmail(user?.email || clerkUser?.primaryEmailAddress?.emailAddress)}</span>
          <span className="text-muted-foreground/50">·</span>
          <span>{formatDate(conversation.created_at)}</span>
          {(conversation.view_count || 0) >= 50 && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span>{conversation.view_count} views</span>
            </>
          )}
        </div>

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
              className="text-lg leading-relaxed text-pretty prose prose-lg max-w-none [&>p]:mb-4 [&>p:last-child]:mb-0"
              dangerouslySetInnerHTML={{ __html: formatDescription(conversation.description) }}
            />
          </div>
        )}

      </section>

      {/* Audio Section — placed right after the summary so listeners can start immediately */}
      {hasAudio && (
        <section id="audio" className="scroll-mt-24 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Listen to Conversation</h2>
          <PlayAllControl messages={messages} />
        </section>
      )}

      {/* Insights / Verdict Section */}
      {(hasInsights || isOwner) && (
        <section id="insights" className="scroll-mt-24 mb-8">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="flex items-center gap-2 text-2xl font-semibold">
              <Lightbulb className="h-6 w-6 text-primary" /> Insights
            </h2>
            {isOwner && (
              <Button variant="outline" size="sm" onClick={handleGenerateInsights} disabled={generatingInsights}>
                {generatingInsights ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4 mr-2" /> {hasInsights ? "Regenerate" : "Generate insights"}
                  </>
                )}
              </Button>
            )}
          </div>

          {insightsError && (
            <p className="text-sm text-destructive mb-4">{insightsError}</p>
          )}

          {hasInsights ? (
            <InsightsPanel verdicts={verdicts!} />
          ) : (
            <Card className="p-8 text-center bg-muted/30 border-dashed">
              <p className="text-muted-foreground">
                {generatingInsights
                  ? "Distilling this conversation into a decision you can act on…"
                  : "Turn this conversation into a skimmable verdict — the key decisions, a plan, and what to do next."}
              </p>
            </Card>
          )}
        </section>
      )}

      {/* YouTube embed (demoted from the summary) */}
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

      {/* Conversation Section */}
      <section id="conversation" className="scroll-mt-24">
        <h2 className="text-2xl font-semibold mb-6">Conversation</h2>

        {/* Meta information */}
        {showLastUpdated && (
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Last updated {formatDate(conversation.updated_at)}</span>
            </div>
          </div>
        )}

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

        {/* Edit (owner only) and Continue (any logged-in user for community participation) */}
        {(isOwner || isLoggedIn) && (
          <div className="flex flex-wrap gap-3 mb-8">
            {isOwner && (
              <Button variant="outline" onClick={handleEditPost}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit this post
              </Button>
            )}
            {isLoggedIn && (
              <Button
                onClick={handleExtendConversation}
                className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
              >
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Continue this conversation
              </Button>
            )}
          </div>
        )}

        {/* Continue to Part 2 link when this post has a continuation */}
        {firstChildConversation && (
          <div className="mb-8">
            <Link
              href={`/posts/${firstChildConversation.slug}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <ArrowRight className="h-4 w-4" />
              Continue to Part {firstChildConversation.version ?? 2}: {firstChildConversation.title}
            </Link>
          </div>
        )}

        <div className="space-y-1">
        {messages.map((msg, index) => {
          const persona = personaMap.get(msg.personaId)
          const isFirstMessageFromPersona = index === 0 || messages[index - 1].personaId !== msg.personaId

          return (
            <div key={`${msg.id}-${index}`}>
              {/* Show persona name badge when speaker changes */}
              {isFirstMessageFromPersona && (
                <div className="flex items-center gap-3 mb-3 mt-6">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className={getPersonaColor(msg.personaId)}>
                      {getPersonaInitials(msg.personaId, msg.role)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-sm">{persona?.name || msg.role}</span>
                </div>
              )}

              {/* Message card with indentation */}
              <div className="ml-11">
                <Card className="bg-muted/30 border-0 shadow-none">
                  <div className="p-6">
                    <div className="prose prose-sm max-w-none leading-relaxed">
                      {renderMessageWithCitations(msg)}
                    </div>

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
      </section>

      {/* Related: more in this category */}
      {category && (
        <Link href={`/category/${category.slug}`} className="block mt-12 group">
          <Card className="p-6 flex items-center justify-between gap-4 bg-muted/30 transition-colors group-hover:bg-muted/50">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Keep exploring
              </p>
              <p className="text-lg font-semibold">More in {category.name}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
          </Card>
        </Link>
      )}
    </div>
  )
}
