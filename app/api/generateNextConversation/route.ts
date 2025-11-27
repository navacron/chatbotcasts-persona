import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { createPerplexity } from "@ai-sdk/perplexity"

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Authentication will be checked when publishing, not when generating

    const body = await request.json()
    const { currentPersonaId, allPersonaIds, chatHistory, topic } = body

    console.log("[v0] Generate conversation request:", {
      currentPersonaId,
      allPersonaIds,
      historyLength: chatHistory?.length || 0,
      topic,
    })

    // Validate input
    if (!currentPersonaId || !allPersonaIds || !Array.isArray(allPersonaIds)) {
      return NextResponse.json({ error: "Missing required fields: currentPersonaId, allPersonaIds" }, { status: 400 })
    }

    // Fetch persona details from database
    const { data: personas, error: personasError } = await supabase.from("persona").select("*").in("id", allPersonaIds)

    if (personasError) {
      console.error("[v0] Error fetching personas:", personasError)
      return NextResponse.json({ error: "Failed to fetch personas" }, { status: 500 })
    }

    // Find the current persona
    const currentPersona = personas.find((p) => p.id === currentPersonaId)
    if (!currentPersona) {
      return NextResponse.json({ error: "Current persona not found" }, { status: 404 })
    }

    let conversationContext = ""
    if (chatHistory && chatHistory.length > 0) {
      conversationContext = chatHistory
        .map((msg: any) => {
          const persona = personas.find((p) => p.id === msg.personaId)
          const personaName = persona?.name || "Unknown"
          return `${personaName}: ${msg.message}`
        })
        .join("\n\n")
    }

    const systemPrompt = `You are going to assume this role in the role tag.

<role>${currentPersona.prompt || currentPersona.name}</role>

You are currently part of a podcast, and answer the questions as if you are the persona in the role. Use the context of the chat to continue the conversation naturally.

Output your answer as ${currentPersona.name} would respond. You will be discussing the topic of <topic>${topic}</topic>.

${conversationContext ? `Here is the conversation so far:\n\n${conversationContext}\n\n` : ""}

Continue the conversation naturally as ${currentPersona.name}.`

    console.log("[v0] System prompt:", systemPrompt)

    const perplexity = createPerplexity({
      apiKey: process.env.PERPLEXITY_API_KEY,
    })

    const result = await generateText({
      model: perplexity("sonar"),
      messages: [
        {
          role: "user",
          content: systemPrompt,
        },
      ],
      maxTokens: 500,
      temperature: 0.8,
    })

    console.log("[v0] Perplexity generated:", result.text)

    const responseBody = (result.response as any)?.body
    const fullContent = responseBody?.choices?.[0]?.message?.content || result.text
    const citations = responseBody?.citations || []

    return NextResponse.json({
      success: true,
      message: fullContent,
      citations: citations,
      personaId: currentPersonaId,
      personaName: currentPersona.name,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Error in generateNextConversation:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
