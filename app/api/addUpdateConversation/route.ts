import { generateEmbedding } from "@/lib/embeddings"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { synthesizeVerdicts } from "@/lib/verdicts"
import { pickSchemaKey } from "@/lib/verdict-schemas"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

// Publishing now also synthesizes verdicts (a Perplexity LLM call) inline, on top of
// the embedding call, so allow more headroom than the serverless default.
export const maxDuration = 60

async function resolveParentAndSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentConversationId: string | undefined,
  slugFromBody: string | undefined,
  userId: string
): Promise<{ slug: string; parent_conversation_id: string | null; root_conversation_id: string | null; version: number }> {
  let slug = slugFromBody ?? ""
  let parent_conversation_id: string | null = null
  let root_conversation_id: string | null = null
  let version = 1
  if (!parentConversationId) {
    return { slug, parent_conversation_id, root_conversation_id, version }
  }
  const { data: parent, error: parentError } = await supabase
    .from("conversations")
    .select("id, slug, user_id, is_public, root_conversation_id, version")
    .eq("id", parentConversationId)
    .maybeSingle()
  if (parentError || !parent) {
    throw new Error("Parent conversation not found or invalid.")
  }
  const isOwner = (parent as { user_id?: string }).user_id === userId
  const isPublicParent = (parent as { is_public?: boolean }).is_public === true
  if (!isOwner && !isPublicParent) {
    throw new Error("You do not have access to continue this conversation.")
  }
  parent_conversation_id = parent.id
  root_conversation_id = (parent as { root_conversation_id?: string }).root_conversation_id ?? parent.id
  const parentVersion = (parent as { version?: number }).version ?? 1
  version = parentVersion + 1
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    const baseSlug = (parent as { slug: string }).slug
    let candidate = `${baseSlug}-2`
    const { data: existing } = await supabase.from("conversations").select("id").eq("slug", candidate).maybeSingle()
    if (existing) {
      let n = 3
      while (true) {
        candidate = `${baseSlug}-${n}`
        const { data: ex } = await supabase.from("conversations").select("id").eq("slug", candidate).maybeSingle()
        if (!ex) break
        n++
      }
    }
    slug = candidate
  }
  return { slug, parent_conversation_id, root_conversation_id, version }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in to publish conversations." }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, topic, data, isPublic, slug: slugFromBody, personaIds, categoryId, parentConversationId, feature_image } = body

    // Validate required fields first (before checking credits)
    if (!title || !topic || !data) {
      return NextResponse.json(
        { error: "Missing required fields: title, topic, and data are required" },
        { status: 400 },
      )
    }

    if (!personaIds || !Array.isArray(personaIds) || personaIds.length === 0) {
      return NextResponse.json({ error: "At least one persona must be included in the conversation" }, { status: 400 })
    }

    if (!categoryId) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 })
    }

    // Use service client for credit operations (bypasses RLS)
    const supabaseService = createServiceClient()

    // PRE-CHECK: Get available credits before attempting to decrement
    const { data: availableCreditsBefore, error: preCheckError } = await supabaseService.rpc(
      "get_available_credits",
      {
        p_user_id: userId,
      }
    )

    if (preCheckError) {
      console.error("[API] Error getting available credits:", preCheckError)
      return NextResponse.json(
        { error: `Failed to check credits: ${preCheckError.message}` },
        { status: 500 }
      )
    }

    console.log("[API] Pre-check credits for user:", userId, "available:", availableCreditsBefore)

    // Explicitly block if no credits available
    if (!availableCreditsBefore || availableCreditsBefore <= 0) {
      console.log("[API] BLOCKING: User has 0 or negative credits")
      return NextResponse.json(
        {
          error: "Insufficient credits",
          message: `You have ${availableCreditsBefore || 0} credits remaining. You need 1 credit to create a conversation. Please subscribe to get more credits.`,
          availableCredits: availableCreditsBefore || 0,
        },
        { status: 403 }
      )
    }

    // Now attempt to check and decrement credits
    const { data: creditCheck, error: creditError } = await supabaseService.rpc(
      "check_and_decrement_credits",
      {
        p_user_id: userId,
        p_credits_needed: 1,
      }
    )

    if (creditError) {
      console.error("[API] Error checking/decrementing credits:", creditError)
      return NextResponse.json(
        { error: `Failed to check credits: ${creditError.message}` },
        { status: 500 }
      )
    }

    // creditCheck returns a boolean - false means insufficient credits
    if (creditCheck === false || creditCheck === null) {
      console.log("[API] BLOCKING: Credit check returned false/null")
      // Get available credits for error message
      const { data: availableCredits } = await supabaseService.rpc("get_available_credits", {
        p_user_id: userId,
      })

      return NextResponse.json(
        {
          error: "Insufficient credits",
          message: `You have ${availableCredits || 0} credits remaining. You need 1 credit to create a conversation. Please subscribe to get more credits.`,
          availableCredits: availableCredits || 0,
        },
        { status: 403 }
      )
    }

    const supabase = await createClient()

    let slug: string
    let parent_conversation_id: string | null
    let root_conversation_id: string | null
    let version: number
    try {
      const resolved = await resolveParentAndSlug(supabase, parentConversationId, slugFromBody, userId)
      slug = resolved.slug
      parent_conversation_id = resolved.parent_conversation_id
      root_conversation_id = resolved.root_conversation_id
      version = resolved.version
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid parent conversation"
      const status = msg.includes("access") ? 403 : 400
      return NextResponse.json({ error: msg }, { status })
    }

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid slug format. Use lowercase letters, numbers, and hyphens only." },
        { status: 400 },
      )
    }

    const { data: existingConversation, error: slugCheckError } = await supabase
      .from("conversations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle()

    if (slugCheckError) {
      console.error("[API] Error checking slug:", slugCheckError)
      return NextResponse.json({ error: "Failed to check slug availability" }, { status: 500 })
    }

    if (existingConversation) {
      return NextResponse.json({ error: "This slug is already taken. Please choose a different one." }, { status: 409 })
    }

    const { data: conversation, error: insertError } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        title,
        description,
        topic,
        data,
        is_public: isPublic,
        slug,
        category_id: categoryId,
        feature_image: feature_image || null,
        ...(parent_conversation_id && {
          parent_conversation_id,
          root_conversation_id: root_conversation_id ?? undefined,
          version,
        }),
      })
      .select()
      .single()

    if (insertError) {
      console.error("[API] Error inserting conversation:", insertError)
      // Refund the credit since conversation creation failed
      await supabaseService.rpc("increment_credits", {
        p_user_id: userId,
        p_amount: 1,
      })
      return NextResponse.json({ error: `Failed to create conversation: ${insertError.message}` }, { status: 500 })
    }

    // Insert persona relationships into conversation_personas junction table
    // Separate AI personas (from persona table) from human users (from users table)
    const HUMAN_PERSONA_ID = "human"
    
    const personaRelations: Array<{
      conversation_id: string
      persona_id?: string | null
      user_id?: string | null
    }> = []

    for (const personaId of personaIds) {
      if (personaId === HUMAN_PERSONA_ID) {
        personaRelations.push({
          conversation_id: conversation.id,
          user_id: userId,
          persona_id: null,
        })
      } else {
        personaRelations.push({
          conversation_id: conversation.id,
          persona_id: personaId,
          user_id: null,
        })
      }
    }

    const { error: personaError } = await supabase.from("conversation_personas").insert(personaRelations)

    if (personaError) {
      console.error("[API] Error inserting persona relations:", personaError)
      // Rollback: delete the conversation since persona relations failed
      await supabase.from("conversations").delete().eq("id", conversation.id)
      // Also refund the credit since conversation creation failed
      await supabaseService.rpc("increment_credits", {
        p_user_id: userId,
        p_amount: 1,
      })

      return NextResponse.json(
        { error: `Failed to link personas to conversation: ${personaError.message}` },
        { status: 500 },
      )
    }

    // Log credit usage
    await supabaseService.from("credit_usage_log").insert({
      user_id: userId,
      conversation_id: conversation.id,
      credits_used: 1,
      description: `Created conversation: ${title}`,
    })

    // Generate embedding for public conversations (non-blocking; backfill can catch failures)
    if (isPublic) {
      const searchText = `${title || ""} ${description || ""}`.trim()
      if (searchText) {
        try {
          const embedding = await generateEmbedding(searchText)
          await supabase.from("conversations").update({ embedding }).eq("id", conversation.id)
        } catch (_err) {
          // ignore embedding failure; backfill can retry
        }
      }
    }

    // Generate verdicts (skimmable insights) for public conversations.
    // Skipped if the client already supplied data.verdicts (e.g. the publish UI's
    // "Generate insights" button). Non-blocking: failures are acceptable — verdicts
    // can be regenerated later from the post page via /api/generateVerdicts.
    const convData = (data ?? {}) as {
      messages?: Array<{ role?: string; content?: string }>
      title?: string
      plan?: unknown
      verdicts?: unknown
    }
    if (isPublic && !convData.verdicts) {
      const messages = convData.messages ?? []
      if (messages.length > 0) {
        try {
          // Resolve category slug → verdict schema key
          let categorySlug: string | null = null
          const { data: category } = await supabase
            .from("category")
            .select("slug")
            .eq("id", categoryId)
            .maybeSingle()
          categorySlug = (category as { slug?: string } | null)?.slug ?? null
          const schemaKey = pickSchemaKey(categorySlug)

          // plan may be stored as a string (API-direct flow) or an object { text } (UI flow)
          const rawPlan = convData.plan
          const plan =
            typeof rawPlan === "string"
              ? { text: rawPlan }
              : ((rawPlan as { text?: string } | null) ?? null)

          const verdicts = await synthesizeVerdicts({
            title: title || convData.title || "",
            messages,
            schemaKey,
            plan,
          })

          const updatedData = { ...convData, verdicts }
          await supabase.from("conversations").update({ data: updatedData }).eq("id", conversation.id)
          // Reflect verdicts in the response so callers don't see stale data
          ;(conversation as { data?: unknown }).data = updatedData
        } catch (err) {
          console.error("[API] Verdict generation failed (non-blocking):", err)
        }
      }
    }

    // Get updated credit count for response
    const { data: availableCredits } = await supabaseService.rpc("get_available_credits", {
      p_user_id: userId,
    })

    return NextResponse.json({
      success: true,
      conversation,
      personaCount: personaIds.length,
      creditsRemaining: availableCredits || 0,
    })
  } catch (error) {
    console.error("[API] Unexpected error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}
