import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to publish conversations." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, topic, data, isPublic, slug, personaIds } = body;

    // Validate required fields
    if (!title || !topic || !data) {
      return NextResponse.json(
        { error: "Missing required fields: title, topic, and data are required" },
        { status: 400 }
      );
    }

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid slug format. Use lowercase letters, numbers, and hyphens only." },
        { status: 400 }
      );
    }

    if (!personaIds || !Array.isArray(personaIds) || personaIds.length === 0) {
      return NextResponse.json(
        { error: "At least one persona must be included in the conversation" },
        { status: 400 }
      );
    }

    const { data: existingConversation, error: slugCheckError } = await supabase
      .from("conversations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (slugCheckError) {
      console.error('[API] Error checking slug:', slugCheckError);
      return NextResponse.json(
        { error: "Failed to check slug availability" },
        { status: 500 }
      );
    }

    if (existingConversation) {
      return NextResponse.json(
        { error: "This slug is already taken. Please choose a different one." },
        { status: 409 }
      );
    }

    // Insert conversation
    const { data: conversation, error: insertError } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title,
        description,
        topic,
        data, // Stored as JSONB with messages, personas, etc.
        is_public: isPublic,
        slug,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[API] Error inserting conversation:', insertError);
      return NextResponse.json(
        { error: `Failed to create conversation: ${insertError.message}` },
        { status: 500 }
      );
    }

    // Insert persona relationships into conversation_personas junction table
    const personaRelations = personaIds.map((personaId: string) => ({
      conversation_id: conversation.id,
      persona_id: personaId,
    }));

    const { error: personaError } = await supabase
      .from("conversation_personas")
      .insert(personaRelations);

    if (personaError) {
      console.error('[API] Error inserting persona relations:', personaError);
      // Rollback: delete the conversation since persona relations failed
      await supabase
        .from("conversations")
        .delete()
        .eq("id", conversation.id);
      
      return NextResponse.json(
        { error: `Failed to link personas to conversation: ${personaError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      conversation,
      personaCount: personaIds.length
    });
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
