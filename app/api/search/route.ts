import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateEmbedding } from "@/lib/embeddings"
import { extractUsernameFromEmail } from "@/lib/user-utils"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")

    if (!query || query.trim() === "") {
      return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 })
    }

    const queryEmbedding = await generateEmbedding(query)

    const supabase = await createClient()

    const { data: results, error } = await supabase.rpc("search_conversations_hybrid", {
      query_text: query,
      query_embedding: queryEmbedding,
      match_count: 10,
    })

    if (error) {
      console.error("[v0] Error searching conversations:", error)
      return NextResponse.json({ error: "Failed to search conversations" }, { status: 500 })
    }

    if (!results || results.length === 0) {
      return NextResponse.json({ conversations: [], query })
    }

    const threshold =
      parseFloat(process.env.SEARCH_RELEVANCE_THRESHOLD ?? "0") || 0
    const filtered =
      threshold > 0
        ? results.filter((r: any) => (r.similarity ?? 0) >= threshold)
        : results

    if (filtered.length === 0) {
      return NextResponse.json({ conversations: [], query })
    }

    const conversationIds = filtered.map((r: any) => r.id)
    const similarityMap = new Map(filtered.map((r: any) => [r.id, r.similarity]))

    // Fetch matched conversation rows with root/version for grouping
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select(`
        id,
        title,
        description,
        slug,
        view_count,
        feature_image,
        category_id,
        root_conversation_id,
        version,
        users!conversations_user_id_fkey (
          email
        )
      `)
      .in("id", conversationIds)

    if (convError) {
      console.error("[v0] Error fetching conversation details:", convError)
      return NextResponse.json({ error: "Failed to fetch conversation details" }, { status: 500 })
    }

    // Group by root; for each root keep the row with max similarity (best match)
    type ConvRow = (typeof conversations)[0] & { root_conversation_id?: string | null; version?: number }
    const byRoot = new Map<string, { best: ConvRow; similarity: number }>()
    for (const conv of (conversations ?? []) as ConvRow[]) {
      const rootId = conv.root_conversation_id ?? conv.id
      const sim = Number(similarityMap.get(conv.id) ?? 0)
      const existing = byRoot.get(rootId)
      if (!existing || sim > existing.similarity) {
        byRoot.set(rootId, { best: conv, similarity: sim })
      }
    }

    const rootIds = Array.from(byRoot.keys())

    // Fetch category slugs for gradient covers
    const categoryIds = [...new Set((conversations ?? []).map((c: { category_id?: string }) => c.category_id).filter(Boolean))]
    const categorySlugMap = new Map<string, string>()
    if (categoryIds.length > 0) {
      const { data: categories } = await supabase
        .from("category")
        .select("id, slug")
        .in("id", categoryIds)
      categories?.forEach((cat: { id: string; slug: string }) => {
        categorySlugMap.set(cat.id, cat.slug)
      })
    }

    // Fetch root rows for display (title, description, author, etc.)
    const { data: rootRows, error: rootError } = await supabase
      .from("conversations")
      .select(`
        id,
        title,
        description,
        feature_image,
        users!conversations_user_id_fkey ( email )
      `)
      .in("id", rootIds)

    if (rootError) {
      console.error("[v0] Error fetching root details:", rootError)
      return NextResponse.json({ error: "Failed to fetch root details" }, { status: 500 })
    }

    const rootMeta = new Map(
      (rootRows ?? []).map((r: any) => [
        r.id,
        {
          title: r.title,
          description: r.description,
          featureImage: r.feature_image,
          author: extractUsernameFromEmail(r.users?.email),
        },
      ])
    )

    // Fetch all versions (parts) for these roots: root row + any part with root_conversation_id in rootIds
    const { data: versionRowsById } = await supabase
      .from("conversations")
      .select("id, slug, version, root_conversation_id")
      .in("id", rootIds)
    const { data: versionRowsByParent } = await supabase
      .from("conversations")
      .select("id, slug, version, root_conversation_id")
      .in("root_conversation_id", rootIds)
    const seenIds = new Set<string>()
    const versionRows: Array<{ id: string; slug: string; version: number; root_conversation_id: string | null }> = []
    for (const v of versionRowsById ?? []) {
      if (!seenIds.has(v.id)) {
        seenIds.add(v.id)
        versionRows.push(v as any)
      }
    }
    for (const v of versionRowsByParent ?? []) {
      if (!seenIds.has(v.id)) {
        seenIds.add(v.id)
        versionRows.push(v as any)
      }
    }

    const versionsByRoot = new Map<string, { slug: string; version: number }[]>()
    for (const v of versionRows) {
      const rid = (v as any).root_conversation_id ?? v.id
      if (!rootIds.includes(rid)) continue
      if (!versionsByRoot.has(rid)) versionsByRoot.set(rid, [])
      versionsByRoot.get(rid)!.push({ slug: v.slug, version: (v as any).version ?? 1 })
    }
    versionsByRoot.forEach((arr) => arr.sort((a, b) => a.version - b.version))

    // Fetch personas for root rows (for display)
    const { data: personasData } = await supabase
      .from("conversation_personas")
      .select(`
        conversation_id,
        persona ( name )
      `)
      .in("conversation_id", rootIds)

    const personasByConversation = new Map<string, string[]>()
    personasData?.forEach((cp: any) => {
      if (!personasByConversation.has(cp.conversation_id)) {
        personasByConversation.set(cp.conversation_id, [])
      }
      if (cp.persona?.name) {
        personasByConversation.get(cp.conversation_id)?.push(cp.persona.name)
      }
    })

    const conversationsWithData: Array<{
      id: string
      rootId: string
      title: string
      description: string
      slug: string
      participants: string[]
      views: number
      author: string
      featureImage: string | null
      similarity: number
      versions: { slug: string; version: number }[]
    }> = []

    for (const rootId of rootIds) {
      const { best, similarity } = byRoot.get(rootId)!
      const meta = rootMeta.get(rootId) ?? {
        title: best.title,
        description: best.description,
        featureImage: best.feature_image,
        author: extractUsernameFromEmail((best as any).users?.email),
      }
      const categoryId = (best as { category_id?: string }).category_id
      conversationsWithData.push({
        id: best.id,
        rootId,
        title: meta.title,
        description: meta.description ?? "",
        slug: best.slug,
        participants: personasByConversation.get(rootId) || [],
        views: best.view_count ?? 0,
        author: meta.author ?? "",
        featureImage: meta.featureImage ?? best.feature_image,
        categorySlug: categoryId ? categorySlugMap.get(categoryId) ?? null : null,
        similarity,
        versions: versionsByRoot.get(rootId) ?? [{ slug: best.slug, version: best.version ?? 1 }],
      })
    }

    conversationsWithData.sort((a, b) => b.similarity - a.similarity)

    return NextResponse.json({ conversations: conversationsWithData, query })
  } catch (error) {
    console.error("[v0] Search API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
