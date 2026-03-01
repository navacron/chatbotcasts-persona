import { generateText } from "ai"
import { createPerplexity } from "@ai-sdk/perplexity"
import { stripMarkdown } from "@/lib/markdown-utils"
import { auth } from "@clerk/nextjs/server"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    console.log("[v0] Received body:", JSON.stringify(body, null, 2))

    const messages = body.messages

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("[v0] Invalid messages:", messages)
      return Response.json({ error: "Messages must be a non-empty array" }, { status: 400 })
    }

    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey?.trim()) {
      console.error("[v0] PERPLEXITY_API_KEY is not set")
      return Response.json(
        { error: "Perplexity API key not configured", details: "Set PERPLEXITY_API_KEY in .env.local" },
        { status: 503 },
      )
    }

    const perplexity = createPerplexity({ apiKey })

    const coreMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }))

    console.log("[v0] Perplexity Request:")
    console.log("[v0] - Message count:", coreMessages.length)
    console.log("[v0] - Core messages:", JSON.stringify(coreMessages, null, 2))

    const result = await generateText({
      model: perplexity("sonar"),
      messages: coreMessages,
      maxTokens: 2000,
      temperature: 0.7,
    })

    console.log("[v0] Perplexity Response:")
    console.log("[v0] - Text length:", result.text.length)
    console.log("[v0] - Response:", result.text)
    console.log("[v0] - Full result object:", JSON.stringify(result, null, 2))

    const responseBody = (result.response as any)?.body
    const fullContent = responseBody?.choices?.[0]?.message?.content || result.text
    const citations = responseBody?.citations || []

    // Strip markdown formatting (bold, italics, links, etc.) but keep plain-text citations like [1], [2]
    const cleanedText = stripMarkdown(fullContent)

    console.log("[v0] - Full content with citations:", fullContent)
    console.log("[v0] - Citations:", citations)

    return Response.json({
      text: cleanedText,
      citations: citations,
      usage: result.usage,
      finishReason: result.finishReason,
    })
  } catch (error) {
    console.error("[v0] Perplexity API error:", error)
    return Response.json(
      {
        error: "Failed to generate response",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
