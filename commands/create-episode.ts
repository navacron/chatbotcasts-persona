/**
 * ChatbotCasts Episode Creator CLI
 *
 * Creates and publishes a full podcast episode by calling the Next.js API routes.
 * No external npm dependencies — uses Node 18+ built-ins only.
 * # Get token from browser:
  #   await window.Clerk?.session?.getToken()
 * Usage:
 *   npx tsx commands/create-episode.ts \
 *     --token "eyJhbGci..." \
 *     --topic "The Future of Renewable Energy" \
 *     --guests "Aria"
 *
 * With all optional flags (against production):
 *   npx tsx commands/create-episode.ts \
 *     --token "eyJhbGci..." \
 *     --topic "Best Travel Destinations 2025" \
 *     --guests "TravelBot,ExpertAI" \
 *     --title "Top Travel Picks for 2025" \
 *     --slug "top-travel-picks-2025" \
 *     --turns 2 \
 *     --base-url https://www.chatbotcasts.com
 *
 * Get token from browser devtools on chatbotcasts.com:
 *   await window.Clerk?.session?.getToken()
 *
 * stderr → progress logs
 * stdout → episode URL (on success)
 *
 * Enable URL capture:
 *   URL=$(npx tsx commands/create-episode.ts --token "..." --topic "..." --guests "...")
 */

import { parseArgs } from "node:util"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string
  personaId: string
  role: string
  content: string
  citations: string[]
  timestamp: string
}

interface Persona {
  id: string
  name: string
  prompt: string
  is_public?: boolean
  user_id?: string
}

interface Category {
  id: string
  name: string
  slug: string
  description?: string
}

interface ParsedArgs {
  token: string
  topic: string
  guests: string[]
  slug: string | undefined
  title: string | undefined
  turns: number
  baseUrl: string
}

interface PersonasResponse {
  publicPersonas: Persona[]
  myPersonas: Persona[]
}

interface CategoriesResponse {
  categories: Category[]
}

interface PlanResponse {
  success: boolean
  plan: string
  fallback?: boolean
}

interface NextConversationResponse {
  success: boolean
  content: string
  citations: string[]
  personaId: string
  personaName: string
  role: string
  timestamp: string
}

interface PerplexityResponse {
  text: string
  citations: string[]
}

interface PublishResponse {
  success: boolean
  conversation: { id: string; slug: string }
  creditsRemaining: number
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function log(...args: unknown[]): void {
  process.stderr.write(args.join(" ") + "\n")
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function generateMessageId(): string {
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `${Date.now()}-${rand}`
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
}

function validateSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length <= 60
}

function extractHostName(token: string): string {
  try {
    const parts = token.split(".")
    if (parts.length < 2) return "Host"
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"))
    return payload.name || payload.given_name || "Host"
  } catch {
    return "Host"
  }
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// ---------------------------------------------------------------------------
// API fetch wrapper
// ---------------------------------------------------------------------------

async function apiFetch<T>(
  url: string,
  options: RequestInit & { auth?: string } = {}
): Promise<T> {
  const { auth, ...fetchOptions } = options
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  }
  if (auth) {
    headers["Authorization"] = `Bearer ${auth}`
  }

  const doFetch = async (): Promise<Response> =>
    fetch(url, { ...fetchOptions, headers })

  let res = await doFetch()

  // Auto-retry once on 500
  if (res.status === 500) {
    log(`  [retry] 500 error, waiting 3s then retrying...`)
    await sleep(3000)
    res = await doFetch()
  }

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = await res.text()
    }
    throw new ApiError(res.status, `HTTP ${res.status}`, body)
  }

  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseCliArgs(): ParsedArgs {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      token: { type: "string" },
      topic: { type: "string" },
      guests: { type: "string" },
      slug: { type: "string" },
      title: { type: "string" },
      turns: { type: "string" },
      "base-url": { type: "string" },
    },
  })

  const errors: string[] = []
  if (!values.token) errors.push("--token is required")
  if (!values.topic) errors.push("--topic is required")
  if (!values.guests) errors.push("--guests is required (comma-separated persona name substrings)")

  if (errors.length > 0) {
    for (const e of errors) log(`Error: ${e}`)
    log(`\nUsage:\n  npx tsx commands/create-episode.ts --token <jwt> --topic <text> --guests <names>`)
    process.exit(1)
  }

  const slug = values.slug
  if (slug && !validateSlug(slug)) {
    log(`Error: --slug must match /^[a-z0-9-]+$/ and be at most 60 characters`)
    process.exit(1)
  }

  const turnsRaw = values.turns ? parseInt(values.turns, 10) : 3
  if (isNaN(turnsRaw) || turnsRaw < 1) {
    log(`Error: --turns must be a positive integer`)
    process.exit(1)
  }

  return {
    token: values.token!,
    topic: values.topic!,
    guests: values.guests!.split(",").map((g) => g.trim()).filter(Boolean),
    slug: slug || undefined,
    title: values.title || undefined,
    turns: turnsRaw,
    baseUrl: values["base-url"] || "http://localhost:3000",
  }
}

// ---------------------------------------------------------------------------
// Phase 1 — Fetch personas + categories
// ---------------------------------------------------------------------------

async function fetchPersonasAndCategories(
  baseUrl: string,
  token: string
): Promise<{ personas: Persona[]; categories: Category[] }> {
  log("Phase 1: Fetching personas and categories...")

  const [personasRes, categoriesRes] = await Promise.all([
    apiFetch<PersonasResponse>(`${baseUrl}/api/personas`, { auth: token }),
    apiFetch<CategoriesResponse>(`${baseUrl}/api/categories`),
  ])

  // Dedup public + my personas by id
  const seen = new Set<string>()
  const personas: Persona[] = []
  for (const p of [...personasRes.publicPersonas, ...personasRes.myPersonas]) {
    if (!seen.has(p.id)) {
      seen.add(p.id)
      personas.push(p)
    }
  }

  log(`  Found ${personas.length} personas, ${categoriesRes.categories.length} categories`)
  return { personas, categories: categoriesRes.categories }
}

// ---------------------------------------------------------------------------
// Phase 2 — Match guests + detect category
// ---------------------------------------------------------------------------

function matchPersonas(personas: Persona[], guestNames: string[]): Persona[] {
  const matched: Persona[] = []
  for (const name of guestNames) {
    const lower = name.toLowerCase()
    const found = personas.filter((p) => p.name.toLowerCase().includes(lower))
    if (found.length === 0) {
      log(`  Warning: no persona found matching "${name}"`)
    } else {
      if (found.length > 1) {
        log(`  Warning: "${name}" matched ${found.length} personas, using first: ${found[0].name}`)
      }
      if (!matched.find((m) => m.id === found[0].id)) {
        matched.push(found[0])
      }
    }
  }
  if (matched.length === 0) {
    log(`Error: no personas matched. Available: ${personas.map((p) => p.name).join(", ")}`)
    process.exit(1)
  }
  log(`  Matched guests: ${matched.map((p) => p.name).join(", ")}`)
  return matched
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  technology: ["tech", "ai", "software", "coding", "programming", "machine learning", "digital", "cyber", "data", "cloud", "blockchain", "crypto"],
  science: ["science", "physics", "biology", "chemistry", "research", "experiment", "space", "astronomy", "genetics", "evolution"],
  health: ["health", "medical", "medicine", "fitness", "wellness", "mental health", "diet", "nutrition", "exercise", "therapy"],
  business: ["business", "startup", "entrepreneur", "finance", "economy", "market", "investment", "management", "leadership", "strategy"],
  education: ["education", "learning", "school", "university", "teaching", "student", "curriculum", "knowledge", "skill"],
  arts: ["art", "music", "film", "cinema", "literature", "creative", "design", "photography", "theater", "dance"],
  travel: ["travel", "destination", "tourism", "adventure", "culture", "country", "city", "explore", "journey", "trip"],
  food: ["food", "cooking", "recipe", "cuisine", "restaurant", "chef", "nutrition", "diet", "meal"],
  sports: ["sport", "athletic", "game", "team", "player", "competition", "olympic", "fitness", "exercise"],
  politics: ["politics", "government", "policy", "election", "democracy", "law", "rights", "social", "society"],
  environment: ["environment", "climate", "green", "sustainable", "renewable", "energy", "nature", "ecology", "carbon"],
  history: ["history", "historical", "past", "ancient", "civilization", "war", "revolution", "culture", "heritage"],
}

function detectCategory(topic: string, categories: Category[]): Category {
  const lower = topic.toLowerCase()
  const scores: Record<string, number> = {}

  for (const [catKey, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    scores[catKey] = keywords.filter((kw) => lower.includes(kw)).length
  }

  const bestKey = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]

  if (bestKey && bestKey[1] > 0) {
    // Try to find a matching category by slug or name
    const match = categories.find(
      (c) =>
        c.slug.includes(bestKey[0]) ||
        c.name.toLowerCase().includes(bestKey[0])
    )
    if (match) {
      log(`  Detected category: ${match.name}`)
      return match
    }
  }

  // Fallback: first category
  log(`  Could not detect category from topic, using: ${categories[0].name}`)
  return categories[0]
}

// ---------------------------------------------------------------------------
// Phase 3 — Generate plan
// ---------------------------------------------------------------------------

async function generatePlan(baseUrl: string, topic: string): Promise<string[]> {
  log("Phase 3: Generating discussion plan...")

  const res = await apiFetch<PlanResponse>(`${baseUrl}/api/generatePlan`, {
    method: "POST",
    body: JSON.stringify({ title: topic, description: "" }),
  })

  const subtopics = parsePlan(res.plan)
  if (res.fallback) log(`  Note: used fallback plan`)
  log(`  Generated ${subtopics.length} subtopics`)
  return subtopics
}

function parsePlan(planText: string): string[] {
  return planText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\./.test(line))
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 8)
}

// ---------------------------------------------------------------------------
// Phase 4 — Generate conversation
// ---------------------------------------------------------------------------

async function generateHumanTurn(
  baseUrl: string,
  hostName: string,
  topic: string,
  subtopic: string,
  exchangeIndex: number,
  recentMessages: Message[]
): Promise<string> {
  const context =
    recentMessages.length > 0
      ? recentMessages
          .slice(-4)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n\n")
      : ""

  const prompt =
    exchangeIndex === 0
      ? `You are ${hostName}, a curious podcast host. Generate a natural opening question to start a podcast conversation about the subtopic "${subtopic}" within the broader topic "${topic}". Keep it conversational, 1-2 sentences, no more than 30 words. Plain text only.`
      : `You are ${hostName}, a podcast host. Based on this recent conversation:\n\n${context}\n\nGenerate a natural follow-up question about "${subtopic}". Keep it conversational, 1-2 sentences. Plain text only.`

  const res = await apiFetch<PerplexityResponse>(`${baseUrl}/api/ai/perplexity`, {
    method: "POST",
    body: JSON.stringify({
      messages: [{ role: "user", content: prompt }],
    }),
  })

  return res.text.trim()
}

async function generateAiTurn(
  baseUrl: string,
  token: string,
  persona: Persona,
  allPersonaIds: string[],
  messages: Message[],
  topic: string,
  subtopic: string
): Promise<NextConversationResponse> {
  return apiFetch<NextConversationResponse>(`${baseUrl}/api/generateNextConversation`, {
    method: "POST",
    auth: token,
    body: JSON.stringify({
      currentPersonaId: persona.id,
      allPersonaIds,
      messages,
      title: topic,
      focusedSubtopic: subtopic,
    }),
  })
}

async function generateConversation(
  baseUrl: string,
  token: string,
  hostName: string,
  topic: string,
  subtopics: string[],
  guests: Persona[],
  turns: number
): Promise<Message[]> {
  log("Phase 4: Generating conversation...")

  const allPersonaIds = ["human", ...guests.map((g) => g.id)]
  const messages: Message[] = []

  for (let si = 0; si < subtopics.length; si++) {
    const subtopic = subtopics[si]
    log(`  Subtopic ${si + 1}/${subtopics.length}: ${subtopic}`)

    for (let ti = 0; ti < turns; ti++) {
      // Human turn
      log(`    Exchange ${ti + 1}/${turns} — generating host question...`)
      const humanContent = await generateHumanTurn(
        baseUrl,
        hostName,
        topic,
        subtopic,
        ti,
        messages
      )

      const humanMsg: Message = {
        id: generateMessageId(),
        personaId: "human",
        role: hostName,
        content: humanContent,
        citations: [],
        timestamp: new Date().toISOString(),
      }
      messages.push(humanMsg)

      // AI turns — each guest responds
      for (const guest of guests) {
        log(`    Exchange ${ti + 1}/${turns} — generating ${guest.name} response...`)
        const aiRes = await generateAiTurn(
          baseUrl,
          token,
          guest,
          allPersonaIds,
          messages,
          topic,
          subtopic
        )

        const aiMsg: Message = {
          id: generateMessageId(),
          personaId: guest.id,
          role: guest.name,
          content: aiRes.content,
          citations: aiRes.citations || [],
          timestamp: aiRes.timestamp || new Date().toISOString(),
        }
        messages.push(aiMsg)
      }
    }
  }

  log(`  Generated ${messages.length} messages total`)
  return messages
}

// ---------------------------------------------------------------------------
// Phase 5 — Generate title
// ---------------------------------------------------------------------------

async function generateTitle(baseUrl: string, topic: string): Promise<string> {
  log("Phase 5: Generating title...")

  const res = await apiFetch<PerplexityResponse>(`${baseUrl}/api/ai/perplexity`, {
    method: "POST",
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: `Generate a 5-10 word SEO-friendly podcast episode title for the topic: "${topic}". Return only the title, no quotes, no punctuation at the end, plain text.`,
        },
      ],
    }),
  })

  const title = res.text.trim().replace(/^["']|["']$/g, "")
  log(`  Title: ${title}`)
  return title
}

// ---------------------------------------------------------------------------
// Phase 6 — Generate description
// ---------------------------------------------------------------------------

async function generateDescription(
  baseUrl: string,
  topic: string,
  messages: Message[]
): Promise<string> {
  log("Phase 6: Generating description...")

  const transcript = messages
    .slice(0, 8)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n\n")

  const res = await apiFetch<PerplexityResponse>(`${baseUrl}/api/ai/perplexity`, {
    method: "POST",
    body: JSON.stringify({
      messages: [
        {
          role: "user",
          content: `Write a 2-3 sentence podcast episode description (SEO-friendly, engaging) for an episode about "${topic}". Here is a snippet of the conversation:\n\n${transcript}\n\nPlain text only, no markdown.`,
        },
      ],
    }),
  })

  const description = res.text.trim()
  log(`  Description generated (${description.length} chars)`)
  return description
}

// ---------------------------------------------------------------------------
// Phase 7 — Publish
// ---------------------------------------------------------------------------

async function publishEpisode(
  baseUrl: string,
  token: string,
  title: string,
  description: string,
  topic: string,
  messages: Message[],
  plan: string[],
  personaIds: string[],
  categoryId: string,
  slugOverride: string | undefined
): Promise<PublishResponse> {
  log("Phase 7: Publishing episode...")

  let slug = slugOverride || generateSlug(title)
  if (!validateSlug(slug)) {
    slug = generateSlug(title)
    log(`  Warning: slug was invalid, regenerated: ${slug}`)
  }

  const body = {
    title,
    description,
    topic,
    data: { messages, title, plan: plan.join("\n") },
    isPublic: true,
    slug,
    personaIds,
    categoryId,
  }

  try {
    const res = await apiFetch<PublishResponse>(`${baseUrl}/api/addUpdateConversation`, {
      method: "POST",
      auth: token,
      body: JSON.stringify(body),
    })
    log(`  Published! Credits remaining: ${res.creditsRemaining}`)
    return res
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      // Slug collision — append -2 and retry once
      const retrySlug = `${slug.slice(0, 57)}-2`
      log(`  Slug "${slug}" taken, retrying with "${retrySlug}"...`)
      body.slug = retrySlug
      const res = await apiFetch<PublishResponse>(`${baseUrl}/api/addUpdateConversation`, {
        method: "POST",
        auth: token,
        body: JSON.stringify(body),
      })
      log(`  Published! Credits remaining: ${res.creditsRemaining}`)
      return res
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Error handler
// ---------------------------------------------------------------------------

function handlePublishError(err: unknown, baseUrl: string): never {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      log(`\nError: Token expired. Get a fresh one from the browser:`)
      log(`  await window.Clerk?.session?.getToken()`)
      process.exit(1)
    }
    if (err.status === 403) {
      const body = err.body as { availableCredits?: number } | undefined
      const credits = body?.availableCredits ?? 0
      log(`\nError: Insufficient credits (${credits} available).`)
      log(`  Subscribe at: ${baseUrl}/pricing`)
      process.exit(1)
    }
    if (err.status === 400) {
      const body = err.body as { error?: string } | undefined
      log(`\nError: Bad request — ${body?.error ?? "unknown"}`)
      process.exit(1)
    }
    log(`\nError: API returned ${err.status}`)
    log(JSON.stringify(err.body, null, 2))
    process.exit(1)
  }
  throw err
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseCliArgs()
  const hostName = extractHostName(args.token)

  log(`\nChatbotCasts Episode Creator`)
  log(`  Topic:    ${args.topic}`)
  log(`  Guests:   ${args.guests.join(", ")}`)
  log(`  Host:     ${hostName}`)
  log(`  Turns:    ${args.turns}`)
  log(`  Base URL: ${args.baseUrl}`)
  log("")

  // Phase 1
  const { personas, categories } = await fetchPersonasAndCategories(args.baseUrl, args.token)

  // Phase 2
  const guests = matchPersonas(personas, args.guests)
  const category = detectCategory(args.topic, categories)

  // Phase 3
  const subtopics = await generatePlan(args.baseUrl, args.topic)

  // Phase 4
  const messages = await generateConversation(
    args.baseUrl,
    args.token,
    hostName,
    args.topic,
    subtopics,
    guests,
    args.turns
  )

  // Phase 5
  const title = args.title || (await generateTitle(args.baseUrl, args.topic))

  // Phase 6
  const description = await generateDescription(args.baseUrl, args.topic, messages)

  // Phase 7
  let result: PublishResponse
  try {
    result = await publishEpisode(
      args.baseUrl,
      args.token,
      title,
      description,
      args.topic,
      messages,
      subtopics,
      ["human", ...guests.map((g) => g.id)],
      category.id,
      args.slug
    )
  } catch (err) {
    handlePublishError(err, args.baseUrl)
  }

  const url = `${args.baseUrl}/posts/${result!.conversation.slug}`
  log(`\nEpisode published successfully!`)
  log(`  Title:    ${title}`)
  log(`  Slug:     ${result!.conversation.slug}`)
  log(`  Messages: ${messages.length}`)
  log(`  URL:      ${url}`)
  log("")

  // stdout: just the URL (for shell capture)
  process.stdout.write(url + "\n")
}

main().catch((err) => {
  log(`\nFatal error: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
