/**
 * Generate embeddings for conversation search
 * Uses OpenAI's text-embedding-3-small model (1536 dimensions)
 */

interface EmbeddingResponse {
  embedding: number[]
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Using OpenAI via AI Gateway or direct API
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float",
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  } catch (error) {
    console.error("[v0] Error generating embedding:", error)
    throw error
  }
}

export async function updateConversationEmbedding(
  conversationId: string,
  title: string,
  description: string,
): Promise<void> {
  try {
    // Concatenate title and description
    const searchText = `${title} ${description}`

    // Generate embedding
    const embedding = await generateEmbedding(searchText)

    // Update conversation with embedding
    const response = await fetch("/api/conversations/update-embedding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversationId,
        embedding,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to update embedding")
    }
  } catch (error) {
    console.error("[v0] Error updating conversation embedding:", error)
    throw error
  }
}
