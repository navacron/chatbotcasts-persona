/**
 * verdict-schemas.ts — schema registry for the verdict synthesizer.
 *
 * A "verdict" is a structured, skimmable artifact synthesized from a finished
 * conversation. The SAME synthesizer (lib/verdicts.ts) produces verdicts for any
 * topic — only the schema changes, picked by the conversation's category.
 *
 * A schema has two parts:
 *   perSubtopic: one card per planned subtopic (the resolution of that slice).
 *   rollup:      one whole-conversation artifact assembled from the cards.
 * `type` picks which render primitive InsightsPanel draws.
 *
 * Mirrors eval/config/verdict_schemas.yaml (kept in sync intentionally).
 */

export interface VerdictSchemaPart {
  type: string
  fields: string[]
  instruction: string
}

export interface VerdictSchema {
  description: string
  perSubtopic: VerdictSchemaPart
  rollup: VerdictSchemaPart
}

export interface VerdictCard {
  subtopic?: string
  question?: string
  the_call?: string
  why?: string
  confidence?: string
  dissent?: string
  quote?: string
  speaker?: string
  [key: string]: unknown
}

// A short verbatim quote + speaker, appended to every per-subtopic card so the
// grounding in the conversation is provable (and quotable by answer engines).
const QUOTE_FIELDS = ["quote", "speaker"]
const QUOTE_INSTRUCTION =
  " quote: a short verbatim line (max 20 words) actually said by a speaker in this " +
  "subtopic that supports the call; speaker: who said it. If nothing is quotable, set both to empty strings."

export interface Verdicts {
  schemaType: string
  perSubtopicType: string
  rollupType: string
  perSubtopic: VerdictCard[]
  rollup: Record<string, unknown>
  generatedAt?: string
}

export const VERDICT_SCHEMAS: Record<string, VerdictSchema> = {
  "travel-decision": {
    description: "Per-subtopic decision + a trip-planning rollup.",
    perSubtopic: {
      type: "verdict-card",
      fields: ["question", "the_call", "why", "confidence", "dissent", ...QUOTE_FIELDS],
      instruction:
        "From each subtopic's exchange, identify the core question debated (question), state THE single recommended call for the specific traveler described in the title (the_call), give a one-sentence why grounded in a concrete detail someone said (why), rate how strongly the speakers supported it as low|med|high (confidence), and note any genuine disagreement that remained or \"none\" (dissent). One or two sentences per field. Do not invent facts." +
        QUOTE_INSTRUCTION,
    },
    rollup: {
      type: "trip-plan",
      fields: ["bottom_line", "budget_breakdown", "day_plan", "book_now"],
      instruction:
        "Synthesize the cards into a concrete plan for the traveler in the title. bottom_line: one actionable sentence. budget_breakdown: a list of {label, amount} rows. If the title states a total budget, the amounts must SUM to it (add a buffer row so it sums exactly). If the title gives NO explicit budget, infer realistic non-zero amounts from figures mentioned in the discussion (e.g. a per-day cost times the number of days, plus flights) and keep the same currency the speakers used — never output zeros. day_plan: a list of {days, what} rows covering the full trip length. book_now: a list of {item, when} rows. Do not introduce destinations or prices the conversation never mentioned.",
    },
  },

  "product-review": {
    description: "Per-subtopic decision + a buying-guide rollup.",
    perSubtopic: {
      type: "verdict-card",
      fields: ["question", "the_call", "why", "confidence", ...QUOTE_FIELDS],
      instruction:
        "From each subtopic's exchange, identify the buying question debated (question), state the recommended call (the_call), give a one-sentence why grounded in a concrete detail (why), and rate support as low|med|high (confidence). Do not invent specs or prices." +
        QUOTE_INSTRUCTION,
    },
    rollup: {
      type: "comparison",
      fields: ["items", "criteria", "cells", "pros_cons", "overall_pick", "best_for_map"],
      instruction:
        "Build a buying guide. items: the options compared (array of names). criteria: the dimensions compared (array). cells: a list of {item, criterion, value} entries. pros_cons: a list of {item, pros, cons} with short string arrays. overall_pick: {item, why}. best_for_map: a list of {use_case, item}. Use ONLY specifics present in the conversation; never invent prices or model numbers.",
    },
  },

  // Generic default — works for any debate/discussion (tech, art, finance, etc.)
  discussion: {
    description: "Per-subtopic decision + a key-points rollup.",
    perSubtopic: {
      type: "verdict-card",
      fields: ["question", "the_call", "why", "confidence", "dissent", ...QUOTE_FIELDS],
      instruction:
        "From each subtopic's exchange, identify the core question debated (question), state the takeaway or recommended position the discussion lands on (the_call), give a one-sentence why grounded in a concrete point someone made (why), rate support as low|med|high (confidence), and note any genuine disagreement that remained or \"none\" (dissent)." +
        QUOTE_INSTRUCTION,
    },
    rollup: {
      type: "key-points",
      fields: ["bottom_line", "key_takeaways", "open_questions"],
      instruction:
        "Synthesize the cards into: bottom_line (one sentence a listener leaves with); key_takeaways (a list of short, specific, non-redundant strings); open_questions (a list of strings the discussion did not resolve). Use only what was actually discussed.",
    },
  },
}

/** Category slug → schema key. Unmapped categories fall back to the generic schema. */
export const CATEGORY_SCHEMA_MAP: Record<string, string> = {
  travel: "travel-decision",
  trips: "travel-decision",
  shopping: "product-review",
  products: "product-review",
  reviews: "product-review",
  gear: "product-review",
}

export const DEFAULT_SCHEMA_KEY = "discussion"

export function pickSchemaKey(categorySlug?: string | null): string {
  if (categorySlug && CATEGORY_SCHEMA_MAP[categorySlug]) {
    return CATEGORY_SCHEMA_MAP[categorySlug]
  }
  return DEFAULT_SCHEMA_KEY
}

export function getSchema(schemaKey: string): VerdictSchema {
  return VERDICT_SCHEMAS[schemaKey] ?? VERDICT_SCHEMAS[DEFAULT_SCHEMA_KEY]
}
