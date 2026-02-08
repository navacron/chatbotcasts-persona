import { getConversationById } from "@/lib/conversations"
import { createClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params
    if (!id) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      )
    }

    const result = await getConversationById(id)
    if (!result) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      )
    }

    const conversation = result.conversation as { user_id?: string }
    if (conversation.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden: not the owner" }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: revisions, error } = await supabase
      .from("conversation_revisions")
      .select("id, conversation_id, content, created_at, editor_id")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[API] Error fetching revisions:", error)
      return NextResponse.json(
        { error: "Failed to fetch revisions" },
        { status: 500 }
      )
    }

    return NextResponse.json({ revisions: revisions ?? [] })
  } catch (error) {
    console.error("[API] GET revisions error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
