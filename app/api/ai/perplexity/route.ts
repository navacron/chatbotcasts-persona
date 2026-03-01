import { generateText } from "ai"
import { createPerplexity } from "@ai-sdk/perplexity"
import { stripMarkdown } from "@/lib/markdown-utils"
import { auth } from "@clerk/nextjs/server"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const authResult = await auth()
    const { userId } = authResult

    if (!userId) {
      const hasSession = "sessionId" in authResult && !!authResult.sessionId
      const reason = !hasSession
        ? "No session (user not logged in or session expired)"
        : "Clerk auth returned no userId"
      console.error("[perplexity] 401 Unauthorized:", {
        reason,
        hasSessionId: hasSession,
        path: "/api/ai/perplexity",
      })
      return Response.json(
        {
          error: "Unauthorized",
          details: "You must be signed in to use this feature. Please sign in and try again.",
          reason,
        },
        { status: 401 },
      )
    }

    const body = await req.json()
    console.log("[perplexity] Request from userId:", userId?.slice(0, 12) + "...")

    const messages = body.messages

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("[perplexity] 400 Bad request: invalid messages", { messageCount: messages?.length })
      return Response.json({ error: "Messages must be a non-empty array" }, { status: 400 })
    }

    const apiKey = process.env.PERPLEXITY_API_KEY
    if (!apiKey?.trim()) {
      console.error("[perplexity] 503: PERPLEXITY_API_KEY is not set")
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

    console.log("[perplexity] Calling Perplexity API, message count:", coreMessages.length)

    const result = await generateText({
      model: perplexity("sonar"),
      messages: coreMessages,
      maxTokens: 2000,
      temperature: 0.7,
    })

    console.log("[perplexity] Success, text length:", result.text.length)

    const responseBody = (result.response as any)?.body
    const fullContent = responseBody?.choices?.[0]?.message?.content || result.text
    const citations = responseBody?.citations || []

    // Strip markdown formatting (bold, italics, links, etc.) but keep plain-text citations like [1], [2]
    const cleanedText = stripMarkdown(fullContent)

    console.log("[perplexity] Citations count:", citations?.length ?? 0)

    return Response.json({
      text: cleanedText,
      citations: citations,
      usage: result.usage,
      finishReason: result.finishReason,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    const stack = error instanceof Error ? error.stack : undefined
    console.error("[perplexity] 500 Error:", message, stack ? "\n" + stack : "")
    return Response.json(
      {
        error: "Failed to generate response",
        details: message,
      },
      { status: 500 },
    )
  }
}
