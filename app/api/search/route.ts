import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateEmbedding } from "@/lib/embeddings"
import { extractUsernameFromEmail } from "@/lib/user-utils"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")

    if (!query || query.trim() === "") {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 })
    }

    const queryEmbedding = await generateEmbedding(query)

    const supabase = await createClient()

    const { data: results, error } = await supabase.rpc("search_conversations_hybrid", {
      query_text: query,
      query_embedding: queryEmbedding,
      match_count: 10,
    })

    if (error) {
      console.error("[v0] Error searching conversations:", error)
      return NextResponse.json({ error: "Failed to search conversations" }, { status: 500 })
    }

    if (!results || results.length === 0) {
      return NextResponse.json({ conversations: [], query })
    }

    const conversationIds = results.map((r: any) => r.id)

    // Fetch full conversation data with personas and author info
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select(`
        id,
        title,
        description,
        slug,
        view_count,
        feature_image,
        users!conversations_user_id_fkey (
          email
        )
      `)
      .in("id", conversationIds)

    if (convError) {
      console.error("[v0] Error fetching conversation details:", convError)
      return NextResponse.json({ error: "Failed to fetch conversation details" }, { status: 500 })
    }

    // Fetch personas for all conversations
    const { data: personasData } = await supabase
      .from("conversation_personas")
      .select(`
        conversation_id,
        persona (
          name
        )
      `)
      .in("conversation_id", conversationIds)

    const personasByConversation = new Map<string, string[]>()
    personasData?.forEach((cp: any) => {
      if (!personasByConversation.has(cp.conversation_id)) {
        personasByConversation.set(cp.conversation_id, [])
      }
      if (cp.persona?.name) {
        personasByConversation.get(cp.conversation_id)?.push(cp.persona.name)
      }
    })

    // Merge results with similarity scores
    const similarityMap = new Map(results.map((r: any) => [r.id, r.similarity]))

    const conversationsWithData =
      conversations?.map((conv: any) => {
        const email = (conv as any).users?.email
        const username = extractUsernameFromEmail(email)

        return {
          id: conv.id,
          title: conv.title,
          description: conv.description,
          slug: conv.slug,
          participants: personasByConversation.get(conv.id) || [],
          views: conv.view_count || 0,
          author: username,
          featureImage: conv.feature_image,
          similarity: similarityMap.get(conv.id),
        }
      }) || []

    // Sort by similarity score (highest first)
    conversationsWithData.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))

    return NextResponse.json({ conversations: conversationsWithData, query })
  } catch (error) {
    console.error("[v0] Search API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
