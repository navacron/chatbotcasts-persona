import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { title, description, topic, data, isPublic, slug } = body;

    if (!title || !topic || !data) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Invalid slug format. Use lowercase letters, numbers, and hyphens only." },
        { status: 400 }
      );
    }

    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingConversation) {
      return NextResponse.json(
        { error: "This slug is already taken. Please choose a different one." },
        { status: 409 }
      );
    }

    const { data: conversation, error: insertError } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title,
        description,
        topic,
        data, // Stored as JSONB
        is_public: isPublic,
        slug,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, conversation });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
