import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { conversationId, embedding } = await request.json()

    if (!conversationId || !embedding) {
      return NextResponse.json({ error: "Missing conversationId or embedding" }, { status: 400 })
    }

    const supabase = await createClient()

    // Update conversation with embedding vector
    const { error } = await supabase.from("conversations").update({ embedding }).eq("id", conversationId)

    if (error) {
      console.error("[v0] Error updating embedding:", error)
      return NextResponse.json({ error: "Failed to update embedding" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error in update-embedding API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
