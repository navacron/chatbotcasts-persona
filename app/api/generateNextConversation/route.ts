import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { createPerplexity } from "@ai-sdk/perplexity"
import { stripMarkdown, removeCitations } from "@/lib/markdown-utils"
import Anthropic from "@anthropic-ai/sdk"

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { currentPersonaId, allPersonaIds, messages, title, focusedSubtopic } = body

    console.log("[v0] Generate conversation request:", {
      currentPersonaId,
      allPersonaIds,
      messagesLength: messages?.length || 0,
      title,
      focusedSubtopic,
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

    const historyLimit = parseInt(process.env.CONVERSATION_HISTORY_LIMIT ?? "10", 10)
    let conversationContext = ""
    if (messages && messages.length > 0) {
      const recentMessages = messages.slice(-historyLimit)
      conversationContext = recentMessages
        .map((msg: any) => {
          const personaName = msg.role || "Unknown"
          return `${personaName}: ${msg.content}`
        })
        .join("\n\n")
    }

    const systemPrompt = `You are ${currentPersona.name}. And your role is: ${currentPersona.prompt}`

    const userPrompt = `${focusedSubtopic ? `Currently discussing: ${focusedSubtopic}\n\n` : ""}Guidelines:
You are speaking in a recorded podcast conversation. Respond as ${currentPersona.name} would naturally speak — not as a writer, not as a professor.

HARD RULES — these are non-negotiable:
1. Do NOT open your turn by restating, summarizing, or acknowledging what the previous speaker said. No "Great point", no "You nailed it", no "As [Name] said". Start with YOUR own thought, mid-conversation.
2. Do NOT end with a summary statement or philosophical wrap-up ("What stays with me...", "What lingers...", "The real question is..."). End on a specific claim, a question, or an unresolved tension.
3. You MUST either disagree with something from the previous turn, introduce a genuinely new angle, or challenge an assumption. Pure agreement is not allowed.
4. Pick ONE specific point and go deep. Do not enumerate multiple facts or regulatory requirements. No information dumps.
5. Response length: 90–130 words. Strict.

Formatting:
Spoken language only. You are talking, not writing.
Use contractions (don't, isn't, we've, they're).
Short sentences. Incomplete thoughts are fine. Real speech is messy.
Plain text only. No markdown, no asterisks, no headings, no bullet points.

Novelty rule:
Every turn must move the conversation to a different place than where it started.
If the previous speaker made a claim: dispute it, qualify it, or flip it with a counter-example.
Never repeat a fact, statistic, or example already mentioned in the conversation.

Voice rules:
Your voice must be recognizably yours, not generic.
Speak from your own experience, your own worldview, your own failures and convictions.
If you are a host or moderator: ask a sharp, uncomfortable question. Do not recap. Do not agree. Challenge.
If you are a domain expert: be specific to your domain. Reference real things you know. Do not be a generalist.
If you are an entrepreneur or builder: talk about constraints, execution, what actually fails in practice.

${conversationContext ? `Here is the conversation so far:\n\n${conversationContext}\n\n` : ""}Respond as ${currentPersona.name} speaking live on a podcast about <topic>${title}</topic>. Start speaking immediately — no preamble, no recap.`

    console.log("[v0] System prompt:", systemPrompt)
    console.log("[v0] User prompt:", userPrompt)

    const backend = process.env.CONVERSATION_BACKEND ?? "perplexity"
    let rawContent: string
    let citations: string[] = []

    if (backend === "claude") {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      // Only search if the topic is likely to have recent developments worth citing.
      // Avoid forcing a search on every turn — each search costs $0.01 + ~4K tokens of context.
      const promptWithSearch =
        userPrompt +
        `\n\nIf there is a specific recent statistic, regulatory update, or news event from the past 12 months that would sharpen your point, use web_search to find it. Otherwise draw from your own knowledge.`

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        system: systemPrompt,
        tools: [{ type: "web_search_20250305" as const, name: "web_search" }],
        messages: [{ role: "user", content: promptWithSearch }],
      })

      // Use only the last text block — Claude emits a text block before
      // web search runs and another after. The last one is the actual response.
      const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text")
      rawContent = textBlocks[textBlocks.length - 1]?.text ?? ""

      citations = response.content
        .filter((b: any) => b.type === "web_search_tool_result")
        .flatMap((b: any) => (Array.isArray(b.content) ? b.content : []))
        .filter((item: any) => item.type === "web_search_result" && item.url)
        .map((item: any) => item.url as string)

      console.log("[v0] Claude generated:", rawContent)
      console.log("[v0] Claude citations:", citations)
    } else {
      const perplexity = createPerplexity({
        apiKey: process.env.PERPLEXITY_API_KEY,
      })
      const result = await generateText({
        model: perplexity("sonar"),
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        maxTokens: 500,
        temperature: 0.9,
      } as any)

      console.log("[v0] Perplexity generated:", result.text)
      const responseBody = (result.response as any)?.body
      rawContent = responseBody?.choices?.[0]?.message?.content || result.text
      citations = responseBody?.citations || []
    }

    const cleanedContent = removeCitations(stripMarkdown(rawContent))

    console.log("[v0] Final content:", cleanedContent)
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
