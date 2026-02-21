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

    let conversationContext = ""
    if (messages && messages.length > 0) {
      conversationContext = messages
        .map((msg: any) => {
          const personaName = msg.role || "Unknown"
          return `${personaName}: ${msg.content}`
        })
        .join("\n\n")
    }

    const systemPrompt = `You are ${currentPersona.name}. And your role is: ${currentPersona.prompt}`

    const userPrompt = `${focusedSubtopic ? `Currently discussing: ${focusedSubtopic}\n\n` : ""}Guidelines:
Respond naturally as if speaking in a thoughtful podcast.
Use general knowledge unless provided sources are clearly relevant.
Focus on lived experience, emotion, and cultural memory.
Introduce tension or contrast, but avoid exaggeration.
Keep sentences short and grounded.
Let one reflective idea carry the response.
End with a thoughtful observation, not hype.
Response length: Aim for 90–130 words.

Formatting:
Plain text only.
NEVER use markdown formatting.
NEVER use asterisks (**) for bold or emphasis.
Use short paragraphs.
Avoid slang-heavy phrasing.
Use simple punctuation and plain sentences.

${conversationContext ? `Here is the conversation so far:\n\n${conversationContext}\n\n` : ""}Output your answer as ${currentPersona.name} would respond. You will be discussing the topic of <topic>${title}</topic>.`

    console.log("[v0] System prompt:", systemPrompt)
    console.log("[v0] User prompt:", userPrompt)

    const perplexity = createPerplexity({
      apiKey: process.env.PERPLEXITY_API_KEY,
    })

    const result = await generateText({
      model: perplexity("sonar"),
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 500,
      temperature: 0.8,
    } as any)

    console.log("[v0] Perplexity generated:", result.text)

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
        console.log("[v0] OpenAI reformatted content:", reformattedContent)
      } catch (reformatError) {
        console.error("[v0] Error reformatting with OpenAI, using original content:", reformatError)
        // Fall back to original content if reformatting fails
        reformattedContent = contentWithoutCitations
      }
    }

    console.log("[v0] Final content:", reformattedContent)
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
    console.error("[v0] Error in generateNextConversation:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
