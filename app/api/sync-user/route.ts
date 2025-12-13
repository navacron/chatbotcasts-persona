/**
 * API route to manually sync the current Clerk user to the database
 * This can be called from client-side after sign-in to ensure user exists
 */

import { auth, currentUser } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user"

export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get full user data from Clerk
    const user = await currentUser()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const clerkUserData = {
      id: user.id,
      emailAddresses: user.emailAddresses,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
    }

    const result = await syncClerkUserToDatabase(clerkUserData)

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to sync user", details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      userId: result.userId,
      wasExisting: result.wasExisting,
    })
  } catch (error) {
    console.error("[sync-user] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}


