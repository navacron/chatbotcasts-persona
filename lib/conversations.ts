import { createClient } from "@/lib/supabase/server"
import { extractUsernameFromEmail } from "@/lib/user-utils"

export async function getConversationById(id: string) {
  try {
    const supabase = await createClient()

    // Fetch conversation by ID with user data
    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select(`
        *,
        users!conversations_user_id_fkey(email)
      `)
      .eq("id", id)
      .maybeSingle()

    if (conversationError) {
      console.error("[v0] Error fetching conversation:", conversationError)
      return null
    }

    if (!conversation) {
      return null
    }

    // Fetch persona IDs from conversation_personas
    const { data: conversationPersonas, error: personasError } = await supabase
      .from("conversation_personas")
      .select("persona_id")
      .eq("conversation_id", conversation.id)

    if (personasError) {
      console.error("[v0] Error fetching conversation personas:", personasError)
      return null
    }

    const personaIds = conversationPersonas?.map((cp) => cp.persona_id) || []

    // Fetch persona details
    const { data: personas, error: personaDetailsError } = await supabase
      .from("persona")
      .select("*")
      .in("id", personaIds)

    if (personaDetailsError) {
      console.error("[v0] Error fetching persona details:", personaDetailsError)
    }

    return {
      conversation,
      personas: personas || [],
      user: (conversation as any).users,
    }
  } catch (error) {
    console.error("[v0] Unexpected error in getConversationById:", error)
    return null
  }
}

export async function getConversationBySlug(slug: string) {
  try {
    const supabase = await createClient()

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select(`
        *,
        users!conversations_user_id_fkey(email),
        category!conversations_category_id_fkey(id, name, slug)
      `)
      .eq("slug", slug)
      .maybeSingle()

    if (conversationError) {
      console.error("[v0] Error fetching conversation:", conversationError)
      return null
    }

    if (!conversation) {
      return null
    }

    if (conversation.data && conversation.data.messages) {
      conversation.data.messages = conversation.data.messages.map((msg: any) => {
        if (!msg.personaId) {
          if (msg.role === "user" || msg.role === "ChatBotCast Host") {
            msg.personaId = "f6a7b8c9-d0e1-4f2a-3b4c-5d6e7f8a9b0c"
            msg.role = "ChatBotCast Host"
          } else if (msg.role === "assistant" || msg.role === "Sab Guru") {
            msg.personaId = "ebacfcb0-ccea-41d5-8e4a-5cb4099f4f4e"
            msg.role = "Sab Guru"
          }
        }
        return msg
      })
    }

    // Fetch persona IDs from conversation_personas
    const { data: conversationPersonas, error: personasError } = await supabase
      .from("conversation_personas")
      .select("persona_id")
      .eq("conversation_id", conversation.id)

    if (personasError) {
      console.error("[v0] Error fetching conversation personas:", personasError)
      return null
    }

    const personaIds = conversationPersonas?.map((cp) => cp.persona_id) || []

    // Fetch persona details
    const { data: personas, error: personaDetailsError } = await supabase
      .from("persona")
      .select("*")
      .in("id", personaIds)

    if (personaDetailsError) {
      console.error("[v0] Error fetching persona details:", personaDetailsError)
    }

    // Increment view count
    await supabase
      .from("conversations")
      .update({ view_count: (conversation.view_count || 0) + 1 })
      .eq("id", conversation.id)

    return {
      conversation,
      personas: personas || [],
      user: (conversation as any).users,
      category: (conversation as any).category,
    }
  } catch (error) {
    console.error("[v0] Unexpected error in getConversationBySlug:", error)
    return null
  }
}
