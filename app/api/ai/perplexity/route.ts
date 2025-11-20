import { generateText } from "ai"
import { createPerplexity } from "@ai-sdk/perplexity"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("[v0] Received body:", JSON.stringify(body, null, 2))

    const messages = body.messages

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("[v0] Invalid messages:", messages)
      return Response.json({ error: "Messages must be a non-empty array" }, { status: 400 })
    }

    const perplexity = createPerplexity({
      apiKey: process.env.PERPLEXITY_API_KEY,
    })

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

    return Response.json({
      text: result.text,
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
