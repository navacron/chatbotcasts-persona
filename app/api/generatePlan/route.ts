import { NextResponse } from "next/server"
import { generateText } from "ai"
import { createPerplexity } from "@ai-sdk/perplexity"

export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, description, niche } = body

    console.log("[Plan Gen] Generate plan request:", { title, description, niche })

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

    const nicheContext: Record<string, string> = {
      travel:
        "The conversation features 3 distinct travel perspectives debating each subtopic: a culture purist who values slow travel and local immersion, a bucket-list tourist who optimizes for iconic experiences and efficiency, and a value hacker who scrutinizes every cost and finds high-value alternatives. Generate subtopics where these 3 angles can meaningfully clash — covering planning trade-offs, local vs. iconic experiences, budget decisions, and logistical realities. IMPORTANT: Extract any budget (e.g., $3000), trip duration (e.g., 10 days), destination, or traveller type (e.g., first-time, solo, couple, family) from the topic title. Embed these constraints directly into each subtopic line so they anchor the debate. For example, instead of 'Transport math: shinkansen vs. local rail' write 'Transport math: Nozomi vs. JR Pass on a $3000 first-trip budget'. Every subtopic should reflect the specific trip constraints from the title.",
      finance:
        "The conversation features 3 distinct financial perspectives debating each subtopic: a value bull focused on long-term competitive moats and fundamentals, a macro bear focused on systemic risks and what the market is missing, and a technical analyst who ignores fundamentals and reads only price action and momentum. Generate subtopics where fundamental analysis, macro risk, and technical signals can meaningfully disagree. IMPORTANT: Extract any stock ticker, company name, sector, or investment thesis from the topic title and embed these into each subtopic line so they stay grounded in the specific subject. For example, instead of 'Balance sheet strength' write 'Nvidia balance sheet: cash reserves vs. capex burn rate'.",
      legal:
        "The conversation features 3 distinct legal perspectives debating each subtopic: a defense counsel building the most protective interpretation, an aggressive prosecutor searching for loopholes and vulnerabilities, and a neutral arbitrator assessing who has the stronger argument on the evidence. Generate subtopics where the strength of arguments, exposure points, and ambiguities can be examined from all three angles. IMPORTANT: Extract any contract type, parties involved, jurisdiction, or specific clause from the topic title and embed these into each subtopic line. For example, instead of 'Indemnification clause analysis' write 'SaaS indemnification clause: what the vendor's limitation-of-liability cap actually covers'.",
    }

    const nicheInstruction = niche && nicheContext[niche]
      ? `\n\nIMPORTANT CONTEXT: ${nicheContext[niche]}`
      : ""

    const promptText = `Generate a structured discussion plan for a podcast conversation about: "${title}"${
      description ? `\n\nAdditional context: ${description}` : ""
    }${nicheInstruction}

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
