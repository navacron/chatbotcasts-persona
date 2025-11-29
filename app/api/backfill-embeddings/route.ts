import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const openaiKey = process.env.OPENAI_API_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.statusText} - ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

export async function POST(request: Request) {
  try {
    const { limit = 10 } = await request.json().catch(() => ({}))

    // Get conversations without embeddings
    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("id, title, description, embedding")
      .is("embedding", null)
      .eq("is_public", true)
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: "Failed to fetch conversations", details: error }, { status: 500 })
    }

    if (!conversations || conversations.length === 0) {
      return NextResponse.json({
        message: "No conversations need embedding generation",
        processed: 0,
        failed: 0,
      })
    }

    let processed = 0
    let failed = 0
    const results = []

    for (const conv of conversations) {
      try {
        const searchText = `${conv.title || ""} ${conv.description || ""}`.trim()

        if (!searchText) {
          results.push({
            id: conv.id,
            status: "skipped",
            reason: "no title or description",
          })
          continue
        }

        // Generate embedding
        const embedding = await generateEmbedding(searchText)

        // Update conversation
        const { error: updateError } = await supabase
          .from("conversations")
          .update({ embedding: JSON.stringify(embedding) })
          .eq("id", conv.id)

        if (updateError) {
          failed++
          results.push({
            id: conv.id,
            status: "failed",
            error: updateError.message,
          })
          continue
        }

        // Track in backfill table
        await supabase.from("embedding_backfill_progress").insert({
          conversation_id: conv.id,
          processed: true,
          error_message: null,
        })

        processed++
        results.push({ id: conv.id, status: "success", title: conv.title })

        // Rate limit: wait 100ms between requests
        await new Promise((resolve) => setTimeout(resolve, 100))
      } catch (error) {
        failed++
        results.push({
          id: conv.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        })

        // Track failed attempt
        await supabase.from("embedding_backfill_progress").insert({
          conversation_id: conv.id,
          processed: false,
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    return NextResponse.json({
      message: "Backfill batch complete",
      processed,
      failed,
      total: conversations.length,
      results,
    })
  } catch (error) {
    console.error("Backfill error:", error)
    return NextResponse.json(
      {
        error: "Failed to backfill embeddings",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET() {
  try {
    // Get status of backfill progress
    const { data: total } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("is_public", true)

    const { data: withEmbeddings } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .not("embedding", "is", null)
      .eq("is_public", true)

    const { data: progress } = await supabase
      .from("embedding_backfill_progress")
      .select("processed", { count: "exact" })

    const totalProcessed = progress?.filter((p) => p.processed).length || 0
    const totalFailed = progress?.filter((p) => !p.processed).length || 0

    return NextResponse.json({
      totalConversations: total?.length || 0,
      withEmbeddings: withEmbeddings?.length || 0,
      remaining: (total?.length || 0) - (withEmbeddings?.length || 0),
      backfillAttempts: {
        processed: totalProcessed,
        failed: totalFailed,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to get backfill status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
