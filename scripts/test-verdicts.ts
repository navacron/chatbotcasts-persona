/**
 * test-verdicts.ts — synthesize + persist verdicts for an existing conversation,
 * so the Insights panel can be viewed on its public page.
 *
 * Usage: npx tsx scripts/test-verdicts.ts <slug> [--persist]
 * Without --persist it is a dry run (synthesize + print only, no DB write).
 */
import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
import { resolve } from "node:path"

config({ path: resolve(process.cwd(), ".env.local") })

import { synthesizeVerdicts } from "../lib/verdicts"
import { pickSchemaKey } from "../lib/verdict-schemas"

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  const slug = process.argv[2]
  if (!slug) {
    console.error("Usage: npx tsx scripts/test-verdicts.ts <slug>")
    process.exit(1)
  }

  const { data: convo, error } = await supabase
    .from("conversations")
    .select("id, slug, title, data, category_id")
    .eq("slug", slug)
    .maybeSingle()
  if (error || !convo) {
    console.error("Conversation not found:", slug, error)
    process.exit(1)
  }

  const data = (convo.data as any) || {}
  const messages = data.messages || []

  let categorySlug: string | null = null
  if (convo.category_id) {
    const { data: cat } = await supabase.from("category").select("slug").eq("id", convo.category_id).maybeSingle()
    categorySlug = (cat as any)?.slug ?? null
  }
  const schemaKey = pickSchemaKey(categorySlug)

  console.log(`Synthesizing: "${convo.title}"  [category=${categorySlug} → schema=${schemaKey}, ${messages.length} msgs, plan=${data.plan?.text ? "yes" : "no"}]`)

  const verdicts = await synthesizeVerdicts({
    title: convo.title || data.title || "",
    messages,
    schemaKey,
    plan: data.plan ?? null,
  })

  if (process.env.VERDICTS_OUT) {
    const fs = await import("node:fs")
    fs.writeFileSync(process.env.VERDICTS_OUT, JSON.stringify(verdicts, null, 2))
    console.log(`(wrote fixture → ${process.env.VERDICTS_OUT})`)
  }

  const persist = process.argv.includes("--persist")
  if (persist) {
    const { error: upErr } = await supabase
      .from("conversations")
      .update({ data: { ...data, verdicts } })
      .eq("id", convo.id)
    if (upErr) {
      console.error("Persist failed:", upErr)
      process.exit(1)
    }
    console.log(`\n✅ Persisted. rollupType=${verdicts.rollupType}, ${verdicts.perSubtopic.length} cards`)
  } else {
    console.log(`\n(dry run — not persisted). rollupType=${verdicts.rollupType}, ${verdicts.perSubtopic.length} cards`)
  }
  console.log("\n--- rollup ---")
  console.log(JSON.stringify(verdicts.rollup, null, 2))
  console.log("\n--- first card ---")
  console.log(JSON.stringify(verdicts.perSubtopic[0], null, 2))
  console.log(`\nView at: /posts/${slug}`)
}

main()
