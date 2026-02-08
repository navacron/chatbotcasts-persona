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
    const fetchLimit = Math.max(postsLimit * 3, 60)

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
        root_conversation_id,
        version,
        users!conversations_user_id_fkey (
          id,
          display_name,
          email
        )
      `)
      .order("created_at", { ascending: false })
      .limit(fetchLimit)

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

    // Fetch personas and human users for all conversations in a single query
    const conversationIds = conversationsData.map((c) => c.id)
    const { data: allPersonaLinks, error: personaError } = await supabase
      .from("conversation_personas")
      .select(`
        conversation_id,
        persona_id,
        user_id,
        persona:persona (
          id,
          name
        ),
        users:users (
          id,
          email
        )
      `)
      .in("conversation_id", conversationIds)

    if (personaError) {
      console.error("[v0] Error fetching personas:", personaError)
    }

    // Group personas and human users by conversation
    const personasByConversation = new Map<string, string[]>()
    allPersonaLinks?.forEach((link: any) => {
      const convId = link.conversation_id
      if (convId) {
        if (!personasByConversation.has(convId)) {
          personasByConversation.set(convId, [])
        }
        // Add AI persona name if present
        if (link.persona?.name) {
          personasByConversation.get(convId)?.push(link.persona.name)
        }
        // Add "Human" for human users
        if (link.user_id && link.users) {
          const humanName = extractUsernameFromEmail(link.users.email) || "Human"
          personasByConversation.get(convId)?.push(humanName)
        }
      }
    })

    // Group by root: root_id = root_conversation_id ?? id
    type Row = (typeof conversationsData)[0] & { root_conversation_id?: string | null; version?: number }
    const byRoot = new Map<string, Row[]>()
    for (const c of conversationsData as Row[]) {
      const rootId = c.root_conversation_id ?? c.id
      if (!byRoot.has(rootId)) byRoot.set(rootId, [])
      byRoot.get(rootId)!.push(c)
    }

    // For each root, pick the root row (id === root_id) or row with min version
    const rootRows: Row[] = []
    for (const [rootId, group] of byRoot) {
      const rootRow =
        group.find((r) => r.id === rootId) ??
        [...group].sort((a, b) => (a.version ?? 1) - (b.version ?? 1))[0] ??
        group[0]
      rootRows.push(rootRow)
    }
    rootRows.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const rootsToReturn = rootRows.slice(0, postsLimit)

    // Build root-level items with versionCount
    const conversationsWithPersonas = rootsToReturn.map((conv) => {
      const rootId = (conv as Row).root_conversation_id ?? conv.id
      const group = byRoot.get(rootId)!
      const participants = personasByConversation.get(conv.id) || []
      const userData = (conv as any).users
      const email = userData?.email
      const username = extractUsernameFromEmail(email)

      return {
        id: conv.id,
        rootId,
        title: conv.title,
        description: conv.description || "",
        slug: conv.slug,
        participants,
        views: conv.view_count || 0,
        author: username,
        createdAt: conv.created_at,
        categoryId: conv.category_id,
        featureImage: conv.feature_image,
        versionCount: group.length,
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
