import type { MetadataRoute } from "next"

// Cache robots.txt for 1 day to prevent timeout issues
export const revalidate = 86400

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chatbotcasts.com"

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/profile/", "/create/", "/auth/", "/test-prompt/"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
