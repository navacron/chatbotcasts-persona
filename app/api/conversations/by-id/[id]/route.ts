import { generateEmbedding } from "@/lib/embeddings"
import { getConversationById } from "@/lib/conversations"
import { createClient } from "@/lib/supabase/server"
import { auth } from "@clerk/nextjs/server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
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

    return NextResponse.json(result)
  } catch (error) {
    console.error("[v0] Error in GET /api/conversations/by-id/[id]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    const conversation = result.conversation as { id: string; user_id: string }
    if (conversation.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden: not the owner" }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      topic,
      data,
      isPublic,
      categoryId,
      personaIds,
      feature_image,
      restoreRevisionId,
    } = body

    const supabase = await createClient()
    const HUMAN_PERSONA_ID = "human"

    if (restoreRevisionId) {
      const { data: revision, error: revFetchError } = await supabase
        .from("conversation_revisions")
        .select("id, conversation_id, content")
        .eq("id", restoreRevisionId)
        .eq("conversation_id", id)
        .maybeSingle()

      if (revFetchError || !revision) {
        return NextResponse.json(
          { error: "Revision not found or does not belong to this conversation" },
          { status: 400 }
        )
      }

      const content = revision.content as { title?: string; description?: string; topic?: string; data?: any }
      const revTitle = content.title ?? (result.conversation as any).title
      const revTopic = content.topic ?? (result.conversation as any).topic
      const revData = content.data ?? (result.conversation as any).data
      const revDescription = content.description ?? ""

      const revisionContent = {
        title: (result.conversation as any).title,
        description: (result.conversation as any).description,
        topic: (result.conversation as any).topic,
        data: (result.conversation as any).data,
      }
      await supabase.from("conversation_revisions").insert({
        conversation_id: id,
        content: revisionContent,
        editor_id: userId,
      })

      await supabase
        .from("conversations")
        .update({
          title: revTitle,
          description: revDescription,
          topic: revTopic,
          data: revData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      const revPersonaIds = Array.isArray(revData?.allPersonaIds) ? revData.allPersonaIds : []
      if (revPersonaIds.length > 0) {
        await supabase.from("conversation_personas").delete().eq("conversation_id", id)
        const personaRelations: Array<{ conversation_id: string; persona_id: string | null; user_id: string | null }> = []
        for (const personaId of revPersonaIds) {
          if (personaId === HUMAN_PERSONA_ID) {
            personaRelations.push({ conversation_id: id, user_id: userId, persona_id: null })
          } else {
            personaRelations.push({ conversation_id: id, persona_id: personaId, user_id: null })
          }
        }
        await supabase.from("conversation_personas").insert(personaRelations)
      }

      const { data: updated } = await supabase.from("conversations").select().eq("id", id).single()
      return NextResponse.json({ success: true, conversation: updated })
    }

    if (!title || !topic || !data) {
      return NextResponse.json(
        { error: "Missing required fields: title, topic, and data are required" },
        { status: 400 }
      )
    }

    if (!personaIds || !Array.isArray(personaIds) || personaIds.length === 0) {
      return NextResponse.json(
        { error: "At least one persona must be included in the conversation" },
        { status: 400 }
      )
    }

    if (!categoryId) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 })
    }

    // 1. Save current state to conversation_revisions before overwriting
    const revisionContent = {
      title: (result.conversation as any).title,
      description: (result.conversation as any).description,
      topic: (result.conversation as any).topic,
      data: (result.conversation as any).data,
    }
    const { error: revError } = await supabase.from("conversation_revisions").insert({
      conversation_id: id,
      content: revisionContent,
      editor_id: userId,
    })
    if (revError) {
      console.error("[API] Error saving revision:", revError)
      return NextResponse.json(
        { error: "Failed to save revision" },
        { status: 500 }
      )
    }

    // 2. Update conversation row
    const updatePayload: Record<string, unknown> = {
      title,
      description: description ?? "",
      topic,
      data,
      is_public: isPublic ?? true,
      category_id: categoryId,
      updated_at: new Date().toISOString(),
    }
    if (feature_image !== undefined) {
      updatePayload.feature_image = feature_image
    }

    const { error: updateError } = await supabase
      .from("conversations")
      .update(updatePayload)
      .eq("id", id)

    if (updateError) {
      console.error("[API] Error updating conversation:", updateError)
      return NextResponse.json(
        { error: `Failed to update conversation: ${updateError.message}` },
        { status: 500 }
      )
    }

    // 3. Re-sync conversation_personas: delete existing and insert new
    const { error: deletePersonasError } = await supabase
      .from("conversation_personas")
      .delete()
      .eq("conversation_id", id)

    if (deletePersonasError) {
      console.error("[API] Error clearing conversation personas:", deletePersonasError)
      return NextResponse.json(
        { error: "Failed to update personas" },
        { status: 500 }
      )
    }

    const personaRelations: Array<{
      conversation_id: string
      persona_id: string | null
      user_id: string | null
    }> = []
    for (const personaId of personaIds) {
      if (personaId === HUMAN_PERSONA_ID) {
        personaRelations.push({
          conversation_id: id,
          user_id: userId,
          persona_id: null,
        })
      } else {
        personaRelations.push({
          conversation_id: id,
          persona_id: personaId,
          user_id: null,
        })
      }
    }

    const { error: personaError } = await supabase.from("conversation_personas").insert(personaRelations)
    if (personaError) {
      console.error("[API] Error inserting conversation personas:", personaError)
      return NextResponse.json(
        { error: `Failed to link personas: ${personaError.message}` },
        { status: 500 }
      )
    }

    // 4. Refresh embedding if public
    if (isPublic) {
      const searchText = `${title || ""} ${description || ""}`.trim()
      if (searchText) {
        try {
          const embedding = await generateEmbedding(searchText)
          await supabase.from("conversations").update({ embedding }).eq("id", id)
        } catch (err) {
          console.error("[API] Embedding generation failed:", err)
        }
      }
    }

    const { data: updated } = await supabase
      .from("conversations")
      .select()
      .eq("id", id)
      .single()

    return NextResponse.json({ success: true, conversation: updated })
  } catch (error) {
    console.error("[API] PATCH conversation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
