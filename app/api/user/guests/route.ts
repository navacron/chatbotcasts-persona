import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("[v0] Fetching guests for user:", userId)

    const supabase = await createClient()

    // Fetch user's personas with conversation count
    const { data: personas, error } = await supabase
      .from("persona")
      .select(`
        id,
        name,
        prompt,
        document_link,
        slug,
        is_public,
        created_at
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching user guests:", error)
      return NextResponse.json({ error: "Failed to fetch guests", details: error.message }, { status: 500 })
    }

    // For each persona, count how many conversations they're in
    const guestsWithStats = await Promise.all(
      (personas || []).map(async (persona) => {
        const { count, error: countError } = await supabase
          .from("conversation_personas")
          .select("*", { count: "exact", head: true })
          .eq("persona_id", persona.id)

        if (countError) {
          console.error("[v0] Error counting conversations for persona:", persona.id, countError)
        }

        return {
          id: persona.id,
          name: persona.name,
          description: persona.prompt?.substring(0, 100) + "..." || "No description",
          slug: persona.slug,
          isPublic: persona.is_public,
          createdAt: persona.created_at,
          uses: count || 0,
        }
      }),
    )

    console.log("[v0] Returning guests:", guestsWithStats.length)

    return NextResponse.json({ guests: guestsWithStats })
  } catch (error) {
    console.error("[v0] Unexpected error in user guests API:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
