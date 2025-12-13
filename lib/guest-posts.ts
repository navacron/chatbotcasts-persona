/**
 * Utility functions for tracking guest (non-logged-in) user posts
 * Uses localStorage to track the number of posts created
 */

const GUEST_POSTS_KEY = "chatbotcasts_guest_posts"
const GUEST_POSTS_LIMIT = 5

export function getGuestPostCount(): number {
  if (typeof window === "undefined") return 0
  
  try {
    const stored = localStorage.getItem(GUEST_POSTS_KEY)
    if (!stored) return 0
    
    const data = JSON.parse(stored)
    // Check if it's from the same month (reset monthly)
    const now = new Date()
    const storedDate = new Date(data.date)
    
    if (
      now.getMonth() !== storedDate.getMonth() ||
      now.getFullYear() !== storedDate.getFullYear()
    ) {
      // Different month, reset count
      localStorage.removeItem(GUEST_POSTS_KEY)
      return 0
    }
    
    return data.count || 0
  } catch (error) {
    console.error("[guest-posts] Error reading guest post count:", error)
    return 0
  }
}

export function incrementGuestPostCount(): number {
  if (typeof window === "undefined") return 0
  
  try {
    const currentCount = getGuestPostCount()
    const newCount = currentCount + 1
    
    localStorage.setItem(
      GUEST_POSTS_KEY,
      JSON.stringify({
        count: newCount,
        date: new Date().toISOString(),
      })
    )
    
    return newCount
  } catch (error) {
    console.error("[guest-posts] Error incrementing guest post count:", error)
    return 0
  }
}

export function canGuestCreatePost(): boolean {
  return getGuestPostCount() < GUEST_POSTS_LIMIT
}

export function getGuestPostsRemaining(): number {
  return Math.max(0, GUEST_POSTS_LIMIT - getGuestPostCount())
}

