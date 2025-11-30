import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Only protect routes that require authentication
// Public routes: /, /about, /create, /posts, /guests (browsing), /billing, etc.
// Protected routes: /dashboard, /profile
// Note: API routes handle their own authentication (e.g., /api/addUpdateConversation)
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/profile(.*)"])

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
