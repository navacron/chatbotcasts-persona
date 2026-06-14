/**
 * verdict-jsonld.ts — build schema.org structured data from verdicts.
 *
 * The per-subtopic cards are Question → Answer, which maps directly onto a
 * FAQPage. Emitting this on the post page makes each episode eligible for FAQ
 * rich results and gives answer engines (Google AI Overviews, ChatGPT, Perplexity)
 * clean, attributed Q&A to extract.
 */

import type { Verdicts, VerdictCard } from "./verdict-schemas"

function answerText(card: VerdictCard): string {
  const parts = [card.the_call, card.why].filter((s): s is string => !!s && s.trim().length > 0)
  let text = parts.join(" ")
  if (card.quote && String(card.quote).trim()) {
    const speaker = card.speaker && String(card.speaker).trim() ? ` — ${card.speaker}` : ""
    text += ` (${String(card.quote).replace(/^["“”]+|["“”]+$/g, "")}${speaker})`
  }
  return text.trim()
}

/**
 * Returns a schema.org FAQPage object built from the verdict cards, or null when
 * there are no usable question/answer pairs.
 */
export function buildFaqJsonLd(verdicts: Verdicts | undefined | null): Record<string, unknown> | null {
  const cards = verdicts?.perSubtopic
  if (!Array.isArray(cards) || cards.length === 0) return null

  const mainEntity = cards
    .filter((c) => c.question && c.question.trim() && (c.the_call || c.why))
    .map((c) => ({
      "@type": "Question",
      name: c.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: answerText(c),
      },
    }))

  if (mainEntity.length === 0) return null

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  }
}
