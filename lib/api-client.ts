/**
 * Cached API client functions for server-side data fetching
 * Matches the pattern from the old chatcasts project
 */

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"

/**
 * Fetch conversations with caching
 * Used by server components for optimal performance
 */
export async function getConversationsServerCached(categoryId?: string) {
  try {
    const url = categoryId
      ? `${BASE_URL}/api/conversations?categoryId=${categoryId}`
      : `${BASE_URL}/api/conversations`

    const response = await fetch(url, {
      cache: "force-cache",
      next: { revalidate: 3600 }, // 1 hour cache
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.conversations || []
  } catch (error) {
    console.error("[api-client] Error fetching conversations:", error)
    return []
  }
}

/**
 * Fetch categories with caching
 * Used by server components for optimal performance
 */
export async function getCategoriesServerCached() {
  try {
    const response = await fetch(`${BASE_URL}/api/categories`, {
      cache: "force-cache",
      next: { revalidate: 3600 }, // 1 hour cache
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.categories || []
  } catch (error) {
    console.error("[api-client] Error fetching categories:", error)
    return []
  }
}

/**
 * Client-side fetch functions (no caching, for use in client components)
 */
export async function getConversationsClient(categoryId?: string) {
  const url = categoryId ? `/api/conversations?categoryId=${categoryId}` : "/api/conversations"
  const response = await fetch(url)
  const data = await response.json()
  return data.conversations || []
}

export async function getCategoriesClient() {
  const response = await fetch("/api/categories")
  const data = await response.json()
  return data.categories || []
}
