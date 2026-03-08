import { NextResponse } from "next/server"
import { generateText } from "ai"
import { createPerplexity } from "@ai-sdk/perplexity"

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description } = body

    console.log("[Plan Gen] Generate plan request:", { title, description })

    // Validate input
    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Missing required field: title" },
        { status: 400 }
      )
    }

    const perplexity = createPerplexity({
      apiKey: process.env.PERPLEXITY_API_KEY,
    })

    const promptText = `Generate a structured discussion plan for a podcast conversation about: "${title}"${
      description ? `\n\nAdditional context: ${description}` : ""
    }

Create a clear, focused plan with 5-8 subtopics that would make for an engaging podcast discussion.

Requirements:
- Each subtopic should be a single line
- Number each subtopic (1., 2., 3., etc.)
- Keep subtopics concise (5-10 words each)
- Progress logically from introduction to deeper topics
- Use natural, conversational language
- The second-to-last subtopic should reflect on key takeaways and what listeners can act on
- The final subtopic should close the conversation naturally — summarise the discussion, acknowledge open questions, and suggest whether this topic deserves a future episode

Formatting:
- Plain text only
- NEVER use markdown formatting
- NEVER use asterisks (**) for bold or emphasis
- Use simple punctuation and plain sentences

Format your response as a simple numbered list, one line per subtopic.`

    const result = await generateText({
      model: perplexity("sonar"),
      messages: [
        {
          role: "user",
          content: promptText,
        },
      ],
      maxTokens: 800,
      temperature: 0.7,
    } as any)

    console.log("[Plan Gen] Generated plan:", result.text)

    // Basic validation that we got a numbered list
    const planText = result.text.trim()
    if (!planText || planText.length < 20) {
      throw new Error("Generated plan is too short")
    }

    return NextResponse.json({
      success: true,
      plan: planText,
    })
  } catch (error) {
    console.error("[Plan Gen] Error generating plan:", error)

    // Return a fallback plan if AI generation fails
    const fallbackPlan = `1. Introduction and context
2. Current landscape and trends
3. Key challenges and opportunities
4. Practical applications and examples
5. Future outlook and implications`

    return NextResponse.json({
      success: true,
      plan: fallbackPlan,
      fallback: true,
    })
  }
}
