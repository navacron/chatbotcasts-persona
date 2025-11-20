import { streamText, convertToModelMessages, type UIMessage } from "ai"
import { createGateway } from "@ai-sdk/gateway"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json()

    if (!messages || messages.length === 0) {
      return Response.json({ error: "Messages are required" }, { status: 400 })
    }

    const gateway = createGateway({
      apiKey: process.env.AI_GATEWAY_API_KEY,
      baseURL: "https://ai-gateway.vercel.sh/v1/ai",
    })

    console.log("[v0] Calling Perplexity Sonar via AI Gateway with messages:", messages)

    const prompt = convertToModelMessages(messages)

    const result = streamText({
      model: gateway("perplexity/sonar-pro"),
      prompt,
      abortSignal: req.signal,
      maxOutputTokens: 2000,
      temperature: 0.7,
    })

    return result.toUIMessageStreamResponse()
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
