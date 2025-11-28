import { type NextRequest, NextResponse } from "next/server"
import { getConversationBySlug } from "@/lib/conversations"

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    console.log("[v0] API: Fetching conversation with slug:", slug)

    const data = await getConversationBySlug(slug)

    if (!data) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    // The mapping is already done in getConversationBySlug, but this ensures it's applied
    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] API: Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
