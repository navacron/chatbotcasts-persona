import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized. Please log in to publish conversations." }, { status: 401 })
    }

    const body = await request.json()
    const { title, description, topic, data, isPublic, slug, personaIds, categoryId } = body

    // Validate required fields first (before checking credits)
    if (!title || !topic || !data) {
      return NextResponse.json(
        { error: "Missing required fields: title, topic, and data are required" },
        { status: 400 },
      )
    }

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid slug format. Use lowercase letters, numbers, and hyphens only." },
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
        user_id: userId, // Use Clerk userId
        title,
        description,
        topic,
        data, // Stored as JSONB with messages, personas, etc.
        is_public: isPublic,
        slug,
        category_id: categoryId, // Add category_id
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
    const personaRelations = personaIds.map((personaId: string) => ({
      conversation_id: conversation.id,
      persona_id: personaId,
    }))

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
