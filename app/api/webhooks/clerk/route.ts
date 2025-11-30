import { Webhook } from "svix"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { syncClerkUserToDatabase } from "@/lib/sync-clerk-user"

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET!

export async function POST(req: Request) {
  // Get the Svix headers for verification
  const headerPayload = await headers()
  const svix_id = headerPayload.get("svix-id")
  const svix_timestamp = headerPayload.get("svix-timestamp")
  const svix_signature = headerPayload.get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Error occurred -- no svix headers", {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret
  const wh = new Webhook(webhookSecret)

  let evt: any

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as any
  } catch (err) {
    console.error("Error verifying webhook:", err)
    return new NextResponse("Error occurred", {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, image_url, created_at } = evt.data

    // Log the user ID being used - this should match what you see in Clerk Dashboard
    console.log("[clerk-webhook] ========================================")
    console.log("[clerk-webhook] Clerk User ID from webhook:", id)
    console.log("[clerk-webhook] This ID should match Clerk Dashboard → Users → User ID")
    console.log("[clerk-webhook] ========================================")
    
    // Log the full payload for debugging
    console.log("[clerk-webhook] Full event data:", JSON.stringify(evt.data, null, 2))
    console.log("[clerk-webhook] Extracted fields:", {
      id,
      email_addresses,
      first_name,
      last_name,
      hasEmailAddresses: !!email_addresses,
      emailAddressesLength: email_addresses?.length || 0,
      emailAddressesType: typeof email_addresses,
    })

    // Check if email_addresses exists and has at least one email
    if (!email_addresses || !Array.isArray(email_addresses) || email_addresses.length === 0) {
      console.error("[clerk-webhook] No email addresses found. Full payload:", JSON.stringify(evt.data, null, 2))
      return NextResponse.json(
        { 
          error: "No email addresses found in user data", 
          userId: id,
          eventType,
          hasEmailAddresses: !!email_addresses,
        },
        { status: 400 }
      )
    }

    // Log the first email address structure
    console.log("[clerk-webhook] First email address object:", email_addresses[0])

    // Verify we're using the correct ID field
    // The 'id' field should be the main Clerk user ID (format: "user_...")
    // This is what appears in Clerk Dashboard → Users → User ID
    if (!id || typeof id !== 'string') {
      console.error("[clerk-webhook] Invalid or missing user ID in webhook payload")
      return NextResponse.json(
        { error: "Invalid user ID in webhook payload", payload: evt.data },
        { status: 400 }
      )
    }

    // Log to verify ID format
    if (!id.startsWith('user_')) {
      console.warn("[clerk-webhook] WARNING: User ID doesn't start with 'user_':", id)
      console.warn("[clerk-webhook] This might not be the correct Clerk user ID")
    }

    const clerkUserData = {
      id, // This is the Clerk user ID from evt.data.id
      emailAddresses: email_addresses,
      firstName: first_name,
      lastName: last_name,
      imageUrl: image_url,
      createdAt: created_at,
    }

    console.log("[clerk-webhook] About to sync user with ID:", id)
    console.log("[clerk-webhook] Verify this matches Clerk Dashboard → Users → User ID")

    const result = await syncClerkUserToDatabase(clerkUserData)

    if (!result.success) {
      console.error("[clerk-webhook] Failed to sync user:", result.error)
      return NextResponse.json(
        { error: "Failed to sync user", details: result.error },
        { status: 500 }
      )
    }

    console.log(
      `[clerk-webhook] User ${result.userId} synced successfully (existing: ${result.wasExisting})`
    )

    return NextResponse.json({
      success: true,
      userId: result.userId,
      wasExisting: result.wasExisting,
    })
  }

  return NextResponse.json({ received: true })
}

