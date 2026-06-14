import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateText } from "ai"
import { createPerplexity } from "@ai-sdk/perplexity"
import { stripMarkdown, removeCitations } from "@/lib/markdown-utils"

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const body = await request.json()
    const { currentPersonaId, allPersonaIds, messages, title, focusedSubtopic, isFirstTurnOnSubtopic } = body

    console.log("[v8] Generate conversation request:", {
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
      console.error("[v8] Error fetching personas:", personasError)
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

    const systemPrompt = `You are ${currentPersona.name} — the actual person, not an imitation.

${currentPersona.prompt}

You are speaking on a live podcast. Be direct, specific, personal. Sound like yourself — not like a policy briefing, not like a Wikipedia summary. Use contractions. Speak, don't write.`

    const openingInstruction = isFirstTurnOnSubtopic || !conversationContext
      ? `You are the FIRST voice on this topic. Orient the listener — briefly state what this topic is actually about in plain terms, then share your angle on it. Don't assume they already know the stakes. Give them a foothold before you get specific.`
      : `Someone just made a point. Respond to it — dispute it, qualify it, or flip it with a counter-example. Don't restate what they said; advance it.`

    const userPrompt = `${focusedSubtopic ? `Currently discussing: ${focusedSubtopic}\n\n` : ""}${openingInstruction}

FOUR RULES:

1. DON'T REPEAT. Look at what's been said in this subtopic exchange. Do not state any fact, date, example, or argument already made in this exchange. Add something new — your angle, your experience, a complication they missed.

2. STAY SPECIFIC. Name actual companies, products, policy articles, years, people, numbers. "Companies" means nothing. "OUIGO in 2024" means something.

3. GO DEEP. Pick ONE point and dig into it. Don't enumerate. Don't list multiple angles. Real conversations don't cover everything — they get specific and stay there.

4. COVER THE SUBTOPIC. Take your own angle — but stay on what's currently being discussed. Don't drift to adjacent topics.

BANNED OPENERS — never start your response with these:
"Yeah, and", "Hmph,", "Ugh,", "Hah,", "That's the part people miss",
"What X is...", "What matters here...", "What's easy to miss...", "What I'd push on is",
"As X mentioned", "Building on that", "Great point", "That's fair, but",
"I'd push", "I'd argue", "I'd say", "Look,", "So here's the thing",
"Here's the thing", "The thing is", "Here's what", "Let me be clear"

BANNED PHRASES — these signal a pattern-matching model, not a person:
"at the end of the day", "governance framework", "innovation versus regulation",
"The real tension", "The real question", "what stays with me", "ecosystem", "stakeholders"

Formatting:
Spoken language only. Contractions everywhere. Short sentences are fine.
Plain text — no markdown, no bullets, no headings.

Voice rules:
Your voice must be recognizably yours — not generic. Speak from your own experience, worldview, and convictions.
Use language you'd actually use — not academic hedging, not corporate speak.
If you're the host or moderator: ask a sharp question or surface a tension. Don't argue. Don't recap.
If you're a domain expert: be specific to your domain. Reference real things you know. Don't be a generalist.

${conversationContext ? `Here is the conversation so far:\n\n${conversationContext}\n\n` : ""}Respond as ${currentPersona.name} speaking live on a podcast about <topic>${title}</topic>.
90–120 words. Start immediately — no preamble.
Sound like yourself talking, not like you're writing a column.`

    console.log("[v8] System prompt:", systemPrompt)
    console.log("[v8] User prompt:", userPrompt)

    const perplexity = createPerplexity({
      apiKey: process.env.PERPLEXITY_API_KEY,
    })

    const result = await generateText({
      model: perplexity("sonar"),
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 175,
      temperature: 1.0,
    } as any)

    console.log("[v8] Perplexity generated:", result.text)

    const responseBody = (result.response as any)?.body
    const rawContent = responseBody?.choices?.[0]?.message?.content || result.text
    const citations = responseBody?.citations || []

    // Strip markdown formatting and remove citations from Perplexity response
    const cleanedContent = stripMarkdown(rawContent)
    const contentWithoutCitations = removeCitations(cleanedContent)

    // Reformat using OpenAI for better readability
    let reformattedContent = contentWithoutCitations
    
    // Check if OpenAI reformatting is enabled via environment variable
    const enableOpenAIReformat = false
    
    if (process.env.OPENAI_API_KEY && enableOpenAIReformat) {
      try {
        const reformatPrompt = `The following is output from Perplexity. Reformat it to be more naturally converational. 
        If there are many facts break them into smaller paragraphs, so it sounds like a conversation and not a fact dump
Content to reformat:
${contentWithoutCitations}`

        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: reformatPrompt,
              },
            ],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        })

        if (!openaiResponse.ok) {
          throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
        }

        const openaiData = await openaiResponse.json()
        reformattedContent = openaiData.choices?.[0]?.message?.content || contentWithoutCitations
        console.log("[v8] OpenAI reformatted content:", reformattedContent)
      } catch (reformatError) {
        console.error("[v8] Error reformatting with OpenAI, using original content:", reformatError)
        // Fall back to original content if reformatting fails
        reformattedContent = contentWithoutCitations
      }
    }

    console.log("[v8] Final content:", reformattedContent)
    return NextResponse.json({
      success: true,
      content: reformattedContent,
      citations: citations,
      personaId: currentPersonaId,
      personaName: currentPersona.name,
      role: currentPersona.name,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v8] Error in generateNextConversation:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
