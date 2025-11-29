import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const openaiKey = process.env.OPENAI_API_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.statusText} - ${error}`)
  }

  const data = await response.json()
  return data.data[0].embedding
}

async function backfillEmbeddings() {
  console.log("Starting embedding backfill process...")

  // Get all conversations without embeddings
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, title, description, embedding")
    .is("embedding", null)
    .eq("is_public", true)

  if (error) {
    console.error("Error fetching conversations:", error)
    return
  }

  if (!conversations || conversations.length === 0) {
    console.log("No conversations need embedding generation")
    return
  }

  console.log(`Found ${conversations.length} conversations to process`)

  let processed = 0
  let failed = 0

  for (const conv of conversations) {
    try {
      // Concatenate title and description
      const searchText = `${conv.title || ""} ${conv.description || ""}`.trim()

      if (!searchText) {
        console.log(`Skipping conversation ${conv.id}: no title or description`)
        continue
      }

      console.log(`Processing ${processed + 1}/${conversations.length}: ${conv.title}`)

      // Generate embedding
      const embedding = await generateEmbedding(searchText)

      // Update conversation
      const { error: updateError } = await supabase
        .from("conversations")
        .update({ embedding: JSON.stringify(embedding) })
        .eq("id", conv.id)

      if (updateError) {
        console.error(`Failed to update conversation ${conv.id}:`, updateError)
        failed++
        continue
      }

      // Track in backfill table
      await supabase.from("embedding_backfill_progress").insert({
        conversation_id: conv.id,
        processed: true,
        error_message: null,
      })

      processed++

      // Rate limit: wait 100ms between requests
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`Error processing conversation ${conv.id}:`, error instanceof Error ? error.message : error)

      // Track failed attempt
      await supabase.from("embedding_backfill_progress").insert({
        conversation_id: conv.id,
        processed: false,
        error_message: error instanceof Error ? error.message : "Unknown error",
      })

      failed++
    }
  }

  console.log("\nBackfill complete!")
  console.log(`Successfully processed: ${processed}`)
  console.log(`Failed: ${failed}`)
  console.log(`Total: ${conversations.length}`)
}

// Run the backfill
backfillEmbeddings().catch(console.error)
