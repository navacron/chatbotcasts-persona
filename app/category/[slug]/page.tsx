import type { Metadata } from "next"
import { notFound } from "next/navigation"
import CategoryPageClient from "@/components/category-page-client"
import { createClient } from "@/lib/supabase/server"
import { extractUsernameFromEmail } from "@/lib/user-utils"

// Enable Incremental Static Regeneration - cache for 1 hour
export const revalidate = 3600

interface PageProps {
  params: Promise<{
    slug: string
  }>
}

async function getCategory(slug: string) {
  try {
    const supabase = await createClient()
    const postsLimit = Number.parseInt(process.env.POST_LIMIT_CATEGORIES || "20", 10)

    // Fetch category
    const { data: category, error: categoryError } = await supabase
      .from("category")
      .select("id, name, slug, description")
      .eq("slug", slug)
      .single()

    if (categoryError || !category) {
      console.error("[v0] Category not found:", slug, categoryError)
      return null
    }

    // Fetch conversations for this category
    const { data: conversationsData, error: conversationsError } = await supabase
      .from("conversations")
      .select(
        `
        id,
        title,
        description,
        slug,
        view_count,
        created_at,
        category_id,
        user_id,
        feature_image,
        users!conversations_user_id_fkey (
          email
        )
      `,
      )
      .eq("category_id", category.id)
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .limit(postsLimit)

    if (conversationsError) {
      console.error("[v0] Error fetching conversations:", conversationsError)
      return { category, conversations: [] }
    }

    if (!conversationsData || conversationsData.length === 0) {
      return { category, conversations: [] }
    }

    // Fetch personas for all conversations
    const conversationIds = conversationsData.map((c) => c.id)
    const { data: allPersonaLinks, error: personaError } = await supabase
      .from("conversation_personas")
      .select(
        `
        conversation_id,
        persona:persona (
          name
        )
      `,
      )
      .in("conversation_id", conversationIds)

    if (personaError) {
      console.error("[v0] Error fetching personas:", personaError)
    }

    // Group personas by conversation
    const personasByConversation = new Map<string, string[]>()
    allPersonaLinks?.forEach((link: any) => {
      const convId = link.conversation_id
      const personaName = link.persona?.name
      if (convId && personaName) {
        if (!personasByConversation.has(convId)) {
          personasByConversation.set(convId, [])
        }
        personasByConversation.get(convId)?.push(personaName)
      }
    })

    // Format conversations
    const conversationsWithPersonas = conversationsData.map((conv) => {
      const participants = personasByConversation.get(conv.id) || []
      const userData = (conv as any).users
      const email = userData?.email
      const username = extractUsernameFromEmail(email)

      return {
        id: conv.id,
        title: conv.title,
        description: conv.description || "",
        slug: conv.slug,
        participants,
        views: conv.view_count || 0,
        author: username,
        createdAt: conv.created_at,
        categoryId: conv.category_id,
        featureImage: conv.feature_image,
      }
    })

    return { category, conversations: conversationsWithPersonas }
  } catch (error) {
    console.error("[v0] Error fetching category:", error)
    return null
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params // Await params
  const data = await getCategory(slug)

  if (!data || !data.category) {
    return {
      title: "Category Not Found",
    }
  }

  const { category } = data
  const conversationCount = data.conversations?.length || 0

  return {
    title: `${category.name} Conversations | ChatBotCasts`,
    description:
      category.description ||
      `Explore ${conversationCount} AI-powered conversations about ${category.name}. Engage with expert perspectives and diverse viewpoints.`,
    keywords: [category.name, "AI conversations", "podcast", "discussions", "ChatBotCasts"],
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title: `${category.name} Conversations`,
      description:
        category.description ||
        `Explore AI-powered conversations about ${category.name}. ${conversationCount} conversations available.`,
      type: "website",
      url: `https://www.chatbotcasts.com/category/${slug}`,
      siteName: "ChatBotCasts",
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.name} Conversations`,
      description:
        category.description ||
        `Explore AI-powered conversations about ${category.name}. ${conversationCount} conversations available.`,
      creator: "@chatbotcasts",
    },
    alternates: {
      canonical: `https://www.chatbotcasts.com/category/${slug}`,
    },
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params // Await params
  const data = await getCategory(slug)

  if (!data || !data.category) {
    notFound()
  }

  return <CategoryPageClient category={data.category} initialConversations={data.conversations} />
}
