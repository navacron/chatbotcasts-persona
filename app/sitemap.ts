import type { MetadataRoute } from "next"
import { createClient } from "@/lib/supabase/server"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chatbotcasts.com"

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/billing`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${siteUrl}/guests`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/create`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ]

  // Fetch all public conversations for /posts/* URLs and all categories for /category/* URLs
  try {
    const supabase = await createClient()

    const { data: conversations, error: conversationsError } = await supabase
      .from("conversations")
      .select("slug, updated_at, created_at, is_public")
      .eq("is_public", true)

    if (conversationsError) {
      console.error("[sitemap] Error fetching conversations:", conversationsError)
    }

    const { data: categories, error: categoriesError } = await supabase
      .from("category")
      .select("slug, updated_at, created_at")

    if (categoriesError) {
      console.error("[sitemap] Error fetching categories:", categoriesError)
    }

    const postRoutes: MetadataRoute.Sitemap =
      conversations?.map((conv) => ({
        url: `${siteUrl}/posts/${conv.slug}`,
        lastModified: conv.updated_at ? new Date(conv.updated_at) : new Date(conv.created_at || new Date()),
        changeFrequency: "weekly",
        priority: 0.8,
      })) || []

    const categoryRoutes: MetadataRoute.Sitemap =
      categories?.map((cat) => ({
        url: `${siteUrl}/category/${cat.slug}`,
        lastModified: cat.updated_at ? new Date(cat.updated_at) : new Date(cat.created_at || new Date()),
        changeFrequency: "weekly",
        priority: 0.7,
      })) || []

    return [...staticRoutes, ...categoryRoutes, ...postRoutes]
  } catch (err) {
    console.error("[sitemap] Unexpected error:", err)
    // If anything fails, still return the static routes so sitemap.xml is valid
    return staticRoutes
  }
}


