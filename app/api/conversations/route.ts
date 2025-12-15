import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { extractUsernameFromEmail } from "@/lib/user-utils"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const categoryId = searchParams.get("categoryId")
    const userId = searchParams.get("userId")

    const postsLimit = Number.parseInt(process.env.POSTS_LIMIT || "20", 10)

    let query = supabase
      .from("conversations")
      .select(`
        id,
        title,
        description,
        slug,
        view_count,
        created_at,
        category_id,
        user_id,
        is_public,
        feature_image,
        users!conversations_user_id_fkey (
          id,
          display_name,
          email
        )
      `)
      .order("created_at", { ascending: false })
      .limit(postsLimit)

    // Filter by category if specified
    if (categoryId && categoryId !== "all") {
      query = query.eq("category_id", categoryId)
    }

    // Filter by user or only public
    if (userId) {
      query = query.eq("user_id", userId)
    } else {
      query = query.eq("is_public", true)
    }

    const { data: conversationsData, error } = await query

    if (error) {
      console.error("[v0] Error fetching conversations:", error)
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
    }

    if (!conversationsData || conversationsData.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    // Fetch personas for all conversations in a single query
    const conversationIds = conversationsData.map((c) => c.id)
    const { data: allPersonaLinks, error: personaError } = await supabase
      .from("conversation_personas")
      .select(`
        conversation_id,
        persona:persona (
          id,
          name
        )
      `)
      .in("conversation_id", conversationIds)

    if (personaError) {
      console.error("[v0] Error fetching personas:", personaError)
    }

    // Group personas by conversation
    const personasByConversation = new Map<string, string[]>()
    allPersonaLinks?.forEach((link: any) => {
      const convId = link.conversation_id
      const personaName = link.persona?.name
      if (convId && personaName) {
        if (!personasByConversation.has(convId)) {
          personasByConversation.set(convId, [])
        }
        personasByConversation.get(convId)?.push(personaName)
      }
    })

    // Map conversations with personas and author info
    const conversationsWithPersonas = conversationsData.map((conv) => {
      const participants = personasByConversation.get(conv.id) || []
      const userData = (conv as any).users
      const email = userData?.email
      const username = extractUsernameFromEmail(email)

      return {
        id: conv.id,
        title: conv.title,
        description: conv.description || "",
        slug: conv.slug,
        participants,
        views: conv.view_count || 0,
        author: username,
        createdAt: conv.created_at,
        categoryId: conv.category_id,
        featureImage: conv.feature_image,
      }
    })

    return NextResponse.json({ conversations: conversationsWithPersonas })
  } catch (error) {
    console.error("[v0] Unexpected error in conversations API:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
