/**
 * verdicts.ts — schema-driven verdict synthesis for the production app.
 *
 * Reads a finished conversation and emits a structured, skimmable artifact:
 *   - one verdict card per planned subtopic, and
 *   - one whole-conversation rollup (trip-plan / comparison / key-points).
 *
 * Mirrors the eval prototype (eval/eval/synthesizer.py) but runs through the
 * app's existing Perplexity path (createPerplexity + generateText), so it adds
 * no new dependency. A single model call returns the whole artifact; a one-shot
 * repair retry handles malformed JSON.
 *
 * The returned object is stored verbatim at `conversations.data.verdicts`.
 */

import { generateText } from "ai"
import { createPerplexity } from "@ai-sdk/perplexity"
import { getSchema, type Verdicts } from "./verdict-schemas"
import { removeCitations, stripMarkdown } from "./markdown-utils"

const SYSTEM_PROMPT =
  "You are a sharp editor turning a podcast debate into a decision the listener " +
  "can actually act on. You extract concrete conclusions, never restate filler, " +
  "and never invent facts the speakers did not say. " +
  "Return ONLY a JSON object — no prose, no markdown, no text outside the JSON."

interface SynthMessage {
  role?: string
  content?: string
}

interface SynthPlan {
  text?: string
}

export interface SynthesizeArgs {
  title: string
  messages: SynthMessage[]
  schemaKey: string
  plan?: SynthPlan | null
  personaNames?: string[]
  model?: string
}

function extractJson(text: string): Record<string, unknown> {
  let t = (text || "").trim()
  // strip code fences
  t = t.replace(/^```(?:json)?/i, "").replace(/```\s*$/i, "").trim()
  try {
    return JSON.parse(t)
  } catch {
    const start = t.indexOf("{")
    const end = t.lastIndexOf("}")
    if (start !== -1 && end > start) {
      return JSON.parse(t.slice(start, end + 1))
    }
    throw new Error("No JSON object found in model output")
  }
}

async function callModel(modelId: string, system: string, prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY not set")
  const perplexity = createPerplexity({ apiKey })
  const result = await generateText({
    model: perplexity(modelId),
    system,
    messages: [{ role: "user", content: prompt }],
    maxTokens,
    temperature: 0.4,
  } as Parameters<typeof generateText>[0])
  return result.text
}

async function callModelJson(
  modelId: string,
  prompt: string,
  maxTokens: number,
): Promise<Record<string, unknown>> {
  const raw = await callModel(modelId, SYSTEM_PROMPT, prompt, maxTokens)
  try {
    return extractJson(raw)
  } catch {
    const repairPrompt =
      "The following was supposed to be a single valid JSON object but is malformed " +
      "(likely an unescaped quote or a missing comma). Return the corrected, valid " +
      "JSON object only — same content, no other text:\n\n" +
      raw
    const fixed = await callModel(modelId, SYSTEM_PROMPT, repairPrompt, maxTokens)
    return extractJson(fixed)
  }
}

function buildPrompt(args: SynthesizeArgs): string {
  const schema = getSchema(args.schemaKey)
  const transcript = args.messages
    .filter((m) => (m.content || "").trim())
    .map((m) => `${m.role || "Speaker"}: ${m.content}`)
    .join("\n\n")

  const planBlock = args.plan?.text ? `Planned subtopics:\n${args.plan.text}\n\n` : ""
  const speakers = args.personaNames?.length ? `Speakers: ${args.personaNames.join(", ")}\n\n` : ""

  const perKeys = [...schema.perSubtopic.fields, "subtopic"]
  const perShape = `{ ${perKeys.map((f) => `"${f}": ...`).join(", ")} }`
  const rollupShape = `{ ${schema.rollup.fields.map((f) => `"${f}": ...`).join(", ")} }`

  const cardCountRule = args.plan?.text
    ? "Produce exactly one card per planned subtopic above, in order, with the subtopic text in the \"subtopic\" field."
    : "Produce one card per natural section of the discussion (aim for 3 to 6), naming each section in the \"subtopic\" field."

  return `Podcast: ${args.title}

${speakers}${planBlock}Transcript:
${transcript}

Produce a JSON object with EXACTLY this top-level shape:
{
  "perSubtopic": [ ${perShape} ],
  "rollup": ${rollupShape}
}

Per-subtopic cards — ${schema.perSubtopic.instruction}
${cardCountRule}

Rollup — ${schema.rollup.instruction}

Return ONLY the JSON object. No markdown, no commentary.`
}

/** Recursively strip citation markers ([1], [2]) and markdown from all string values. */
function cleanValue<T>(value: T): T {
  if (typeof value === "string") {
    return removeCitations(stripMarkdown(value)) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((v) => cleanValue(v)) as unknown as T
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = cleanValue(v)
    }
    return out as T
  }
  return value
}

export async function synthesizeVerdicts(args: SynthesizeArgs): Promise<Verdicts> {
  const schema = getSchema(args.schemaKey)
  const modelId = args.model ?? "sonar"

  const parsed = await callModelJson(modelId, buildPrompt(args), 3500)

  const perSubtopic = cleanValue(
    Array.isArray(parsed.perSubtopic) ? (parsed.perSubtopic as Verdicts["perSubtopic"]) : [],
  )
  const rollup = cleanValue(
    parsed.rollup && typeof parsed.rollup === "object" ? (parsed.rollup as Record<string, unknown>) : {},
  )

  return {
    schemaType: args.schemaKey,
    perSubtopicType: schema.perSubtopic.type,
    rollupType: schema.rollup.type,
    perSubtopic,
    rollup,
    generatedAt: new Date().toISOString(),
  }
}
