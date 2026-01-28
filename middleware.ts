import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

// Only protect routes that require authentication
// Public routes: /, /about, /create, /posts, /guests (browsing), /billing, etc.
// Protected routes: /dashboard, /profile
// Note: API routes handle their own authentication (e.g., /api/addUpdateConversation)
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/profile(.*)"])

export default clerkMiddleware(async (auth, req) => {
  // Handle protected routes
  if (isProtectedRoute(req)) {
    await auth.protect()
  }

  // Create response
  const response = NextResponse.next()

  // Explicitly set X-Robots-Tag header for public pages to allow indexing
  // This ensures Google can index the site even if there are any default noindex headers
  const pathname = req.nextUrl.pathname
  
  // Only set for public pages (not API routes, not protected routes)
  if (
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/profile") &&
    !pathname.startsWith("/_next")
  ) {
    response.headers.set("X-Robots-Tag", "index, follow")
  }

  return response
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}

