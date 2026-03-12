/**
 * Category-to-gradient color mapping for programmatic cover images.
 * Each category gets a distinct, branded gradient.
 */
const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  travel: ["#0ea5e9", "#06b6d4"],
  "arts-culture": ["#8b5cf6", "#ec4899"],
  sports: ["#22c55e", "#eab308"],
  finance: ["#3b82f6", "#f59e0b"],
  entertainment: ["#a855f7", "#f43f5e"],
  "buying-guide": ["#f97316", "#eab308"],
  technology: ["#6366f1", "#14b8a6"],
  other: ["#64748b", "#94a3b8"],
}

/** Fallback gradients when category is unknown (hash-based for consistency) */
const FALLBACK_GRADIENTS: [string, string][] = [
  ["#8b5cf6", "#ec4899"],
  ["#0ea5e9", "#06b6d4"],
  ["#22c55e", "#eab308"],
  ["#6366f1", "#14b8a6"],
  ["#f97316", "#eab308"],
  ["#3b82f6", "#f59e0b"],
]

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

export function getGradientColors(categorySlug: string | null | undefined, title: string): [string, string] {
  const slug = categorySlug?.toLowerCase().trim()
  if (slug && CATEGORY_GRADIENTS[slug]) {
    return CATEGORY_GRADIENTS[slug]
  }
  const hash = simpleHash(title || "default")
  return FALLBACK_GRADIENTS[hash % FALLBACK_GRADIENTS.length]
}
