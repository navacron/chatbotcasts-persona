import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { extractUsernameFromEmail } from "@/lib/user-utils"

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const supabase = await createClient()
    const { slug } = await context.params // Await params

    const postsLimit = Number.parseInt(process.env.POSTS_LIMIT || "20", 10)

    const { data: category, error: categoryError } = await supabase
      .from("category")
      .select("id, name, slug, description")
      .eq("slug", slug)
      .single()

    if (categoryError || !category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const { data: conversationsData, error: conversationsError } = await supabase
      .from("conversations")
      .select(
        `
        id,
        title,
        description,
        slug,
        view_count,
        created_at,
        category_id,
        user_id,
        feature_image,
        users!conversations_user_id_fkey (
          email
        )
      `,
      )
      .eq("category_id", category.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(postsLimit)

    if (conversationsError) {
      console.error("[v0] Error fetching conversations:", conversationsError)
      return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 })
    }

    if (!conversationsData || conversationsData.length === 0) {
      return NextResponse.json({ category, conversations: [] })
    }

    const conversationIds = conversationsData.map((c) => c.id)
    const { data: allPersonaLinks, error: personaError } = await supabase
      .from("conversation_personas")
      .select(
        `
        conversation_id,
        persona:persona (
          name
        )
      `,
      )
      .in("conversation_id", conversationIds)

    if (personaError) {
      console.error("[v0] Error fetching personas:", personaError)
    }

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

    return NextResponse.json({ category, conversations: conversationsWithPersonas })
  } catch (error) {
    console.error("[v0] Unexpected error in category API:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
