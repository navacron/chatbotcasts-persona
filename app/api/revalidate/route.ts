import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    // Optional: Add secret token validation
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")
    const secret = process.env.REVALIDATE_TOKEN

    if (!secret || token !== secret) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Revalidate main routes
    revalidatePath("/")
    revalidatePath("/about")
    revalidatePath("/guests")
    revalidatePath("/create")
    revalidatePath("/billing")

    // Revalidate dynamic routes
    revalidatePath("/posts/[slug]", "page")
    revalidatePath("/category/[slug]", "page")
    revalidatePath("/guest/[slug]", "page")

    // Revalidate API routes
    revalidatePath("/api/conversations")
    revalidatePath("/api/categories")

    // Revalidate sitemap
    revalidatePath("/sitemap.xml")

    // Also revalidate by tag if using fetch with tags
    revalidateTag("conversations")
    revalidateTag("categories")

    return NextResponse.json({
      revalidated: true,
      message: "All routes revalidated successfully",
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[revalidate] Error:", error)
    return NextResponse.json(
      {
        error: "Error revalidating routes",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
