import { createServiceClient } from "@/lib/supabase/service"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
import { synthesizeVerdicts } from "@/lib/verdicts"
import { pickSchemaKey } from "@/lib/verdict-schemas"

// Synthesizing verdicts is a Perplexity LLM call; allow more than the serverless default.
export const maxDuration = 60

async function resolveCategorySlug(
  supabase: ReturnType<typeof createServiceClient>,
  categoryId?: string | null,
): Promise<string | null> {
  if (!categoryId) return null
  const { data: category } = await supabase
    .from("category")
    .select("slug")
    .eq("id", categoryId)
    .maybeSingle()
  return (category as { slug?: string })?.slug ?? null
}

/**
 * POST /api/generateVerdicts
 *
 * Two modes:
 *   1. Persist mode — Body: { conversationId } — owner-only; loads the conversation,
 *      synthesizes, and persists at conversations.data.verdicts.
 *   2. Stateless mode — Body: { title, messages, plan?, categoryId? } — any logged-in
 *      user; synthesizes and RETURNS verdicts without persisting (used by the publish
 *      UI before the conversation has an id).
 *
 * Does not consume credits.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId } = body

    // ---- Stateless mode (no conversationId): synthesize + return, no persistence ----
    if (!conversationId) {
      const { title, messages, plan, categoryId } = body
      if (!Array.isArray(messages) || messages.length === 0) {
        return NextResponse.json({ error: "messages are required" }, { status: 400 })
      }
      const supabase = createServiceClient()
      const categorySlug = await resolveCategorySlug(supabase, categoryId)
      const schemaKey = pickSchemaKey(categorySlug)
      const verdicts = await synthesizeVerdicts({
        title: title ?? "",
        messages,
        schemaKey,
        plan: plan ?? null,
      })
      return NextResponse.json({ success: true, verdicts })
    }

    // ---- Persist mode (conversationId): owner-only, load + synthesize + save ----
    const supabase = createServiceClient()

    const { data: conversation, error: loadError } = await supabase
      .from("conversations")
      .select("id, user_id, title, data, category_id")
      .eq("id", conversationId)
      .maybeSingle()

    if (loadError || !conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
    }

    if ((conversation as { user_id?: string }).user_id !== userId) {
      return NextResponse.json({ error: "You can only generate insights for your own conversations." }, { status: 403 })
    }

    const data = (conversation as { data?: Record<string, unknown> }).data ?? {}
    const messages = (data.messages as Array<{ role?: string; content?: string }>) ?? []
    if (messages.length === 0) {
      return NextResponse.json({ error: "Conversation has no messages to summarize." }, { status: 400 })
    }

    // Resolve category slug → schema
    const categorySlug = await resolveCategorySlug(supabase, (conversation as { category_id?: string }).category_id)
    const schemaKey = pickSchemaKey(categorySlug)

    const verdicts = await synthesizeVerdicts({
      title: (conversation as { title?: string }).title ?? (data.title as string) ?? "",
      messages,
      schemaKey,
      plan: (data.plan as { text?: string }) ?? null,
    })

    const updatedData = { ...data, verdicts }
    const { error: updateError } = await supabase
      .from("conversations")
      .update({ data: updatedData })
      .eq("id", conversationId)

    if (updateError) {
      console.error("[generateVerdicts] persist error:", updateError)
      return NextResponse.json({ error: "Failed to save insights." }, { status: 500 })
    }

    return NextResponse.json({ success: true, verdicts })
  } catch (error) {
    console.error("[generateVerdicts] error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate insights" },
      { status: 500 },
    )
  }
}
