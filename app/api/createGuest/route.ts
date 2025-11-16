import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, prompt, document_link, slug, is_public } = body

    // Validate required fields
    if (!name || !prompt) {
      return NextResponse.json(
        { error: 'Name and prompt are required' },
        { status: 400 }
      )
    }

    // Generate slug from name if not provided
    const personaSlug = slug || name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim()

    // Check if slug already exists
    const { data: existingPersona } = await supabase
      .from('persona')
      .select('id')
      .eq('slug', personaSlug)
      .maybeSingle()

    if (existingPersona) {
      return NextResponse.json(
        { error: 'A persona with this slug already exists. Please use a different name or slug.' },
        { status: 400 }
      )
    }

    // Insert persona
    const { data: persona, error: insertError } = await supabase
      .from('persona')
      .insert({
        name: name.trim(),
        prompt: prompt.trim(),
        document_link: document_link?.trim() || null,
        slug: personaSlug,
        is_public: is_public === true,
        user_id: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[v0] Error inserting persona:', insertError)
      return NextResponse.json(
        { error: 'Failed to create persona: ' + insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, persona }, { status: 201 })
  } catch (error) {
    console.error('[v0] Error in createGuest API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
