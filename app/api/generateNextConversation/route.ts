import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { currentPersonaId, allPersonaIds, chatHistory, topic } = body

    console.log('[v0] Generate conversation request:', {
      currentPersonaId,
      allPersonaIds,
      historyLength: chatHistory?.length || 0,
      topic
    })

    // Validate input
    if (!currentPersonaId || !allPersonaIds || !Array.isArray(allPersonaIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: currentPersonaId, allPersonaIds' },
        { status: 400 }
      )
    }

    // Fetch persona details from database
    const { data: personas, error: personasError } = await supabase
      .from('persona')
      .select('*')
      .in('id', allPersonaIds)

    if (personasError) {
      console.error('[v0] Error fetching personas:', personasError)
      return NextResponse.json(
        { error: 'Failed to fetch personas' },
        { status: 500 }
      )
    }

    // Find the current persona
    const currentPersona = personas.find(p => p.id === currentPersonaId)
    if (!currentPersona) {
      return NextResponse.json(
        { error: 'Current persona not found' },
        { status: 404 }
      )
    }

    // TODO: Replace this with actual AI generation
    // For now, return a mock response based on the persona's prompt
    const mockResponse = generateMockResponse(currentPersona, chatHistory, topic)

    return NextResponse.json({
      success: true,
      message: mockResponse,
      personaId: currentPersonaId,
      personaName: currentPersona.name,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[v0] Error in generateNextConversation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate mock responses
// TODO: Replace with actual AI model integration
function generateMockResponse(persona: any, chatHistory: any[], topic: string): string {
  const personaName = persona.name
  const prompt = persona.prompt || ''
  
  // Extract key insights from the prompt
  const responses = [
    `Based on my experience, I think ${topic} is fascinating. ${prompt.slice(0, 100)}...`,
    `Let me share my perspective on this. ${prompt.slice(0, 100)}...`,
    `That's an interesting point. From my viewpoint, ${prompt.slice(0, 100)}...`,
    `I'd like to add that ${topic} has significant implications. ${prompt.slice(0, 100)}...`
  ]
  
  // Return a random response (in production, this would be AI-generated)
  const randomIndex = Math.floor(Math.random() * responses.length)
  return responses[randomIndex]
}
