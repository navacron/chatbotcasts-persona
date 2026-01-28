import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { createPerplexity } from "@ai-sdk/perplexity"
import { stripMarkdown } from "@/lib/markdown-utils"

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { currentPersonaId, allPersonaIds, messages, title } = body

    console.log("[v0] Generate conversation request:", {
      currentPersonaId,
      allPersonaIds,
      messagesLength: messages?.length || 0,
      title,
    })

    // Validate input
    if (!currentPersonaId || !allPersonaIds || !Array.isArray(allPersonaIds)) {
      return NextResponse.json({ error: "Missing required fields: currentPersonaId, allPersonaIds" }, { status: 400 })
    }

    // Don't allow generating responses for the human persona
    if (currentPersonaId === "human") {
      return NextResponse.json({ error: "Cannot generate AI response for human persona" }, { status: 400 })
    }

    // Filter out human persona from database query
    const personaIdsToFetch = allPersonaIds.filter((id: string) => id !== "human")

    // Fetch persona details from database
    const { data: personas, error: personasError } = await supabase.from("persona").select("*").in("id", personaIdsToFetch)

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
    if (messages && messages.length > 0) {
      conversationContext = messages
        .map((msg: any) => {
          const personaName = msg.role || "Unknown"
          return `${personaName}: ${msg.content}`
        })
        .join("\n\n")
    }

    const systemPrompt = `You are going to assume this role in the role tag.

<role>${currentPersona.prompt || currentPersona.name}</role>
You are participating in a spoken, podcast-style conversation.

Your goal is NOT to agree by default. You should:
- Add new insight
- Challenge assumptions when appropriate
- Clarify tradeoffs, risks, or uncertainty
- Build on what was said without repeating it

Stay in character at all times and respond naturally as if speaking on a live podcast.

IMPORTANT FORMATTING RULES:
- Use plain text only - NO markdown formatting
- Do NOT use ** for bold, * for italic, or any markdown syntax
- If you reference sources, you MAY include inline numeric citations like [1], [2], [3] in the text
- Write naturally as if speaking aloud in a podcast
- Use emphasis through word choice and phrasing, not formatting

Output your answer as ${currentPersona.name} would respond. You will be discussing the topic of <topic>${title}</topic>.

${conversationContext ? `Here is the conversation so far:\n\n${conversationContext}\n\n` : ""}
`

    console.log("[v0] System prompt:", systemPrompt)

    const perplexity = createPerplexity({
      apiKey: process.env.PERPLEXITY_API_KEY,
    })

    // Use sonar-online for real-time web search and better citations
    // sonar-online provides access to recent news and more relevant citations
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
    } as any)

    console.log("[v0] Perplexity generated:", result.text)

    const responseBody = (result.response as any)?.body
    const rawContent = responseBody?.choices?.[0]?.message?.content || result.text
    const citations = responseBody?.citations || []

    // Strip markdown formatting to make the output more user-friendly
    const cleanedContent = stripMarkdown(rawContent)

    return NextResponse.json({
      success: true,
      content: cleanedContent,
      citations: citations,
      personaId: currentPersonaId,
      personaName: currentPersona.name,
      role: currentPersona.name,
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
