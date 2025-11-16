import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const categoryId = searchParams.get('categoryId')

    console.log('[v0] Fetching conversations with categoryId:', categoryId)

    let query = supabase
      .from('conversations')
      .select(`
        id,
        title,
        description,
        slug,
        view_count,
        created_at,
        category_id,
        user_id
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false })

    // Filter by category if provided
    if (categoryId && categoryId !== 'all') {
      query = query.eq('category_id', categoryId)
    }

    const { data: conversations, error } = await query

    if (error) {
      console.error('[v0] Error fetching conversations:', error)
      return NextResponse.json({ error: 'Failed to fetch conversations', details: error.message }, { status: 500 })
    }

    console.log('[v0] Found conversations:', conversations?.length || 0)

    // Fetch personas for each conversation
    const conversationsWithPersonas = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { data: personaLinks, error: personaError } = await supabase
          .from('conversation_personas')
          .select(`
            persona:persona (
              id,
              name
            )
          `)
          .eq('conversation_id', conv.id)

        if (personaError) {
          console.error('[v0] Error fetching personas for conversation:', conv.id, personaError)
        }

        const participants = personaLinks?.map((link: any) => link.persona?.name || 'Unknown').filter(Boolean) || []

        return {
          id: conv.id,
          title: conv.title,
          description: conv.description || '',
          slug: conv.slug,
          participants,
          views: conv.view_count || 0,
          author: 'Anonymous',
          createdAt: conv.created_at,
          categoryId: conv.category_id,
        }
      })
    )

    console.log('[v0] Returning conversations:', conversationsWithPersonas.length)

    return NextResponse.json({ conversations: conversationsWithPersonas })
  } catch (error) {
    console.error('[v0] Unexpected error in conversations API:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
