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

    // Fetch persona IDs and user IDs from conversation_personas
    const { data: conversationPersonas, error: personasError } = await supabase
      .from("conversation_personas")
      .select("persona_id, user_id")
      .eq("conversation_id", conversation.id)

    if (personasError) {
      console.error("[v0] Error fetching conversation personas:", personasError)
      return null
    }

    // Separate AI personas from human users
    const personaIds = conversationPersonas?.filter((cp) => cp.persona_id).map((cp) => cp.persona_id) || []
    const userIds = conversationPersonas?.filter((cp) => cp.user_id).map((cp) => cp.user_id) || []

    // Fetch persona details for AI personas
    const { data: personas, error: personaDetailsError } = await supabase
      .from("persona")
      .select("*")
      .in("id", personaIds)

    if (personaDetailsError) {
      console.error("[v0] Error fetching persona details:", personaDetailsError)
    }

    // Fetch user details for human participants (if any)
    const { data: humanUsers, error: usersError } = userIds.length > 0
      ? await supabase
          .from("users")
          .select("id, email")
          .in("id", userIds)
      : { data: null, error: null }

    if (usersError) {
      console.error("[v0] Error fetching human user details:", usersError)
    }

    return {
      conversation,
      personas: personas || [],
      humanUsers: humanUsers || [],
      user: (conversation as any).users,
    }
  } catch (error) {
    console.error("[v0] Unexpected error in getConversationById:", error)
    return null
  }
}

export async function getConversationBySlug(slug: string, options?: { skipViewIncrement?: boolean }) {
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

    // Fetch persona IDs and user IDs from conversation_personas
    const { data: conversationPersonas, error: personasError } = await supabase
      .from("conversation_personas")
      .select("persona_id, user_id")
      .eq("conversation_id", conversation.id)

    if (personasError) {
      console.error("[v0] Error fetching conversation personas:", personasError)
      return null
    }

    // Separate AI personas from human users
    const personaIds = conversationPersonas?.filter((cp) => cp.persona_id).map((cp) => cp.persona_id) || []
    const userIds = conversationPersonas?.filter((cp) => cp.user_id).map((cp) => cp.user_id) || []

    // Fetch persona details for AI personas
    const { data: personas, error: personaDetailsError } = await supabase
      .from("persona")
      .select("*")
      .in("id", personaIds)

    if (personaDetailsError) {
      console.error("[v0] Error fetching persona details:", personaDetailsError)
    }

    // Fetch user details for human participants (if any)
    const { data: humanUsers, error: usersError } = userIds.length > 0
      ? await supabase
          .from("users")
          .select("id, email")
          .in("id", userIds)
      : { data: null, error: null }

    if (usersError) {
      console.error("[v0] Error fetching human user details:", usersError)
    }

    if (!options?.skipViewIncrement) {
      await supabase
        .from("conversations")
        .update({ view_count: (conversation.view_count || 0) + 1 })
        .eq("id", conversation.id)
    }

    let parentConversation: { id: string; slug: string; title: string; version?: number } | null = null
    const parentId = (conversation as { parent_conversation_id?: string }).parent_conversation_id
    if (parentId) {
      const { data: parent } = await supabase
        .from("conversations")
        .select("id, slug, title, version")
        .eq("id", parentId)
        .maybeSingle()
      if (parent) {
        parentConversation = {
          id: parent.id,
          slug: parent.slug,
          title: parent.title,
          version: parent.version ?? 1,
        }
      }
    }

    let firstChildConversation: { slug: string; title: string; version?: number } | null = null
    const { data: children } = await supabase
      .from("conversations")
      .select("slug, title, version")
      .eq("parent_conversation_id", conversation.id)
      .order("version", { ascending: true })
      .limit(1)
    const child = Array.isArray(children) ? children[0] : children
    if (child) {
      firstChildConversation = {
        slug: child.slug,
        title: child.title,
        version: child.version ?? 2,
      }
    }

    const HUMAN_PERSONA_ID = "human"
    const linkedPersonaIds: string[] = []
    for (const cp of conversationPersonas || []) {
      if (cp.persona_id) linkedPersonaIds.push(cp.persona_id)
      if (cp.user_id) linkedPersonaIds.push(HUMAN_PERSONA_ID)
    }

    return {
      conversation,
      personas: personas || [],
      humanUsers: humanUsers || [],
      user: (conversation as any).users,
      category: (conversation as any).category,
      parentConversation,
      firstChildConversation,
      linkedPersonaIds,
    }
  } catch (error) {
    console.error("[v0] Unexpected error in getConversationBySlug:", error)
    return null
  }
}
