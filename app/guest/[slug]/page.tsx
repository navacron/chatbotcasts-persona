import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Header from "@/components/header"
import ConversationCard from "@/components/conversation-card"
import { ExternalLink } from "lucide-react"
import Link from "next/link"
import { extractUsernameFromEmail } from "@/lib/user-utils"

interface GuestPageProps {
  params: Promise<{
    slug: string
  }>
}

async function getPersonaWithConversations(slug: string) {
  const supabase = await createClient()
  const postsLimit = Number.parseInt(process.env.POST_LIMIT_CATEGORIES || "50", 10)

  // Check if slug is a UUID format, if so query by id, otherwise by slug
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)

  // Fetch persona by slug or id
  const query = supabase
    .from("persona")
    .select("id, name, slug, prompt, document_link, created_at")
    .eq("is_public", true)

  const { data: persona, error: personaError } = isUUID
    ? await query.eq("id", slug).single()
    : await query.eq("slug", slug).single()

  if (personaError || !persona) {
    return null
  }

  // Fetch conversations featuring this persona
  const { data: conversationPersonas, error: cpError } = await supabase
    .from("conversation_personas")
    .select("conversation_id")
    .eq("persona_id", persona.id)
    .limit(postsLimit)

  if (cpError) {
    console.error("[v0] Error fetching conversation_personas:", cpError)
    return { persona, conversations: [] }
  }

  const conversationIds = conversationPersonas?.map((cp) => cp.conversation_id) || []

  if (conversationIds.length === 0) {
    return { persona, conversations: [] }
  }

  // Fetch full conversation details
  const { data: conversations, error: convError } = await supabase
    .from("conversations")
    .select(
      `
      id,
      title,
      description,
      slug,
      view_count,
      feature_image,
      created_at,
      users!conversations_user_id_fkey(email)
    `,
    )
    .in("id", conversationIds)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(postsLimit)

  if (convError) {
    console.error("[v0] Error fetching conversations:", convError)
    return { persona, conversations: [] }
  }

  // Fetch personas for each conversation
  const { data: allPersonas, error: personasError } = await supabase
    .from("conversation_personas")
    .select("conversation_id, persona(name)")
    .in("conversation_id", conversationIds)

  const personasByConversation = new Map<string, string[]>()
  allPersonas?.forEach((cp: any) => {
    if (!personasByConversation.has(cp.conversation_id)) {
      personasByConversation.set(cp.conversation_id, [])
    }
    if (cp.persona?.name) {
      personasByConversation.get(cp.conversation_id)!.push(cp.persona.name)
    }
  })

  // Format conversations
  const formattedConversations = conversations?.map((conv: any) => {
    const email = conv.users?.email
    const username = extractUsernameFromEmail(email)

    return {
      id: conv.id,
      title: conv.title,
      description: conv.description,
      slug: conv.slug,
      views: conv.view_count || 0,
      author: username,
      participants: personasByConversation.get(conv.id) || [],
      featureImage: conv.feature_image,
    }
  })

  return {
    persona,
    conversations: formattedConversations || [],
  }
}

export async function generateMetadata({ params }: GuestPageProps): Promise<Metadata> {
  const { slug } = await params
  const data = await getPersonaWithConversations(slug)

  if (!data) {
    return {
      title: "Guest Not Found",
    }
  }

  const { persona } = data

  return {
    title: `${persona.name} - Guest Profile | ChatBotCasts`,
    description: persona.prompt?.substring(0, 160) || `Explore conversations featuring ${persona.name}`,
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: `${persona.name} - Guest Profile`,
      description: persona.prompt?.substring(0, 160) || `Explore conversations featuring ${persona.name}`,
      type: "profile",
    },
    twitter: {
      card: "summary_large_card",
      title: `${persona.name} - Guest Profile`,
      description: persona.prompt?.substring(0, 160) || `Explore conversations featuring ${persona.name}`,
    },
  }
}

export default async function GuestPage({ params }: GuestPageProps) {
  const { slug } = await params
  const data = await getPersonaWithConversations(slug)

  if (!data) {
    notFound()
  }

  const { persona, conversations } = data

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        {/* Persona Header */}
        <div className="bg-white border border-border rounded-lg p-8 mb-12 space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">{persona.name}</h1>
            <p className="text-muted-foreground">Guest Profile</p>
          </div>

          {/* Prompt */}
          {persona.prompt && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">About</h2>
              <p className="text-foreground leading-relaxed whitespace-pre-wrap">{persona.prompt}</p>
            </div>
          )}

          {/* Document Link */}
          {persona.document_link && (
            <div className="flex items-center gap-2">
              <Link
                href={persona.document_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                View Reference Document
              </Link>
            </div>
          )}
        </div>

        {/* Conversations Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Conversations featuring {persona.name}</h2>
            <p className="text-muted-foreground">
              {conversations.length} conversation{conversations.length !== 1 ? "s" : ""} found
            </p>
          </div>

          {conversations.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {conversations.map((conversation) => (
                <ConversationCard key={conversation.id} conversation={conversation} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white border border-border rounded-lg">
              <p className="text-muted-foreground">No public conversations found featuring this guest yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
