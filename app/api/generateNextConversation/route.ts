import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { createPerplexity } from "@ai-sdk/perplexity"

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

Your goal is NOT to agree by default, but to:
- Add new insight
- Challenge assumptions when appropriate
- Clarify tradeoffs, risks, and uncertainty
- Build on what was said without repeating it

Global conversation rules:
- Maintain breadth. Do not allow the discussion to remain in a single narrow subtopic, example, theory, technique, anecdote, or case for more than two consecutive turns.
- If the conversation becomes narrow or overly technical, deliberately widen the lens on the next turn by:
  - shifting perspective (beginner vs expert, theory vs practice),
  - changing context (personal, cultural, historical, societal),
  - comparing alternatives or opposing viewpoints.
- Ensure the discussion explores multiple relevant dimensions of the topic, such as:
  - practical application
  - limitations, risks, or misunderstandings
  - human experience, ethics, or values
  - economic, social, or cultural impact
  - learning, mastery, or long-term implications
- Avoid repeatedly extending the same example, scenario, or story; generalize or introduce a new angle instead.
- Encourage natural disagreement, uncertainty, and nuance rather than full consensus.
- Periodically reframe the discussion as if explaining the topic to a different audience (beginner, practitioner, skeptic, or philosopher), when appropriate.

Follow these rules:
1. Avoid repeating the same metrics, examples, or phrases unless adding new context.
2. Occasionally express uncertainty, disagreement, or competing viewpoints.
3. Prefer concrete examples, scenarios, or failure cases over generic predictions.
4. Balance optimism with realism—separate hype from likely outcomes.
5. Keep responses concise but substantive (2–4 strong insights maximum).
6. Advance the conversation forward; do not summarize unless explicitly asked.

Style constraints:
- This is a spoken podcast conversation, not an article or essay.
- Use plain text only (no markdown formatting, no bolding, no headings).
- Do not use emojis or decorative punctuation.
- Prefer short paragraphs and natural spoken language.
- Do not enumerate points unless explicitly requested.
- Aim for roughly 30–60 seconds of spoken audio per response unless otherwise requested.

Turn discipline:
- Do not allow the same speaker to speak more than once in a row unless explicitly prompted.
- If a speaker has already covered a point, they should not restate it unless adding a clearly new angle.

Novelty rule:
- Each response should introduce at least one new idea, perspective, or implication.
- If a response mostly reiterates prior points, it must instead summarize briefly and shift direction.

Stay in character at all times and respond naturally as if speaking on a live podcast.

Output your answer as ${currentPersona.name} would respond. You will be discussing the topic of <topic>${title}</topic>.

${conversationContext ? `Here is the conversation so far:\n\n${conversationContext}\n\n` : ""}
`
//Answer as a normal human would respond and dont include special characters or markdown, clean paragraph. Keep your words around 30 to 80.
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
      content: fullContent,
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
