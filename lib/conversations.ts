import { createClient } from '@/lib/supabase/server'

export async function getConversationBySlug(slug: string) {
  try {
    const supabase = await createClient()

    // Fetch conversation with slug
    const { data: conversation, error: conversationError } = await supabase
      .from('conversations')
      .select('*')
      .eq('slug', slug)
      .maybeSingle()

    if (conversationError) {
      console.error('[v0] Error fetching conversation:', conversationError)
      return null
    }

    if (!conversation) {
      console.log('[v0] Conversation not found for slug:', slug)
      return null
    }

    // Fetch persona IDs from conversation_personas
    const { data: conversationPersonas, error: personasError } = await supabase
      .from('conversation_personas')
      .select('persona_id')
      .eq('conversation_id', conversation.id)

    if (personasError) {
      console.error('[v0] Error fetching conversation personas:', personasError)
      return null
    }

    const personaIds = conversationPersonas?.map((cp) => cp.persona_id) || []

    // Fetch persona details
    const { data: personas, error: personaDetailsError } = await supabase
      .from('persona')
      .select('*')
      .in('id', personaIds)

    if (personaDetailsError) {
      console.error('[v0] Error fetching persona details:', personaDetailsError)
    }

    // Increment view count
    await supabase
      .from('conversations')
      .update({ view_count: (conversation.view_count || 0) + 1 })
      .eq('id', conversation.id)

    return {
      conversation,
      personas: personas || [],
      user: null, // Always set user to null so it displays as Anonymous
    }
  } catch (error) {
    console.error('[v0] Unexpected error in getConversationBySlug:', error)
    return null
  }
}
