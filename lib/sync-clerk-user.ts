/**
 * Utility function to sync Clerk user to public.users table
 * This ensures a user record exists in public.users when they sign up via Clerk
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export interface ClerkUserData {
  id: string
  emailAddresses: Array<{ emailAddress: string }>
  firstName?: string | null
  lastName?: string | null
  imageUrl?: string | null
  createdAt: number
}

/**
 * Syncs a Clerk user to the public.users table
 * Handles email reconciliation for existing users
 */
export async function syncClerkUserToDatabase(clerkUserData: ClerkUserData): Promise<{
  success: boolean
  userId: string
  wasExisting: boolean
  error?: string
}> {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const email = clerkUserData.emailAddresses[0]?.emailAddress
  if (!email) {
    return {
      success: false,
      userId: clerkUserData.id,
      wasExisting: false,
      error: "No email address found",
    }
  }

  const displayName = [clerkUserData.firstName, clerkUserData.lastName]
    .filter(Boolean)
    .join(" ")
    .trim() || email.split("@")[0]

  // Check if user with this email already exists
  const { data: existingUserByEmail, error: emailCheckError } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", email)
    .maybeSingle()

  if (emailCheckError && emailCheckError.code !== "PGRST116") {
    // PGRST116 is "not found" which is fine
    console.error("[sync-clerk-user] Error checking existing user:", emailCheckError)
  }

  // If user exists with same email but different ID, we need to reconcile
  if (existingUserByEmail && existingUserByEmail.id !== clerkUserData.id) {
    // Email reconciliation: Update existing user's ID to match Clerk user ID
    // This handles the case where chatbotcasts@gmail.com exists from old auth
    const { error: updateError } = await supabase
      .from("users")
      .update({
        id: clerkUserData.id, // Update ID to Clerk user ID
        email: email,
        display_name: displayName,
        avatar_url: clerkUserData.imageUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingUserByEmail.id)

    if (updateError) {
      console.error("[sync-clerk-user] Error updating existing user:", updateError)
      return {
        success: false,
        userId: clerkUserData.id,
        wasExisting: true,
        error: updateError.message,
      }
    }

    // Update all related records to use the new user ID
    // Update conversations
    await supabase
      .from("conversations")
      .update({ user_id: clerkUserData.id })
      .eq("user_id", existingUserByEmail.id)

    // Update personas
    await supabase
      .from("persona")
      .update({ user_id: clerkUserData.id })
      .eq("user_id", existingUserByEmail.id)

    // Update billing_history
    await supabase
      .from("billing_history")
      .update({ user_id: clerkUserData.id })
      .eq("user_id", existingUserByEmail.id)

    return {
      success: true,
      userId: clerkUserData.id,
      wasExisting: true,
    }
  }

  // Check if user with Clerk ID already exists
  const { data: existingUserById, error: idCheckError } = await supabase
    .from("users")
    .select("id")
    .eq("id", clerkUserData.id)
    .maybeSingle()

  if (idCheckError && idCheckError.code !== "PGRST116") {
    console.error("[sync-clerk-user] Error checking user by ID:", idCheckError)
  }

  if (existingUserById) {
    // User exists, just update their info
    const { error: updateError } = await supabase
      .from("users")
      .update({
        email: email,
        display_name: displayName,
        avatar_url: clerkUserData.imageUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clerkUserData.id)

    if (updateError) {
      console.error("[sync-clerk-user] Error updating user:", updateError)
      return {
        success: false,
        userId: clerkUserData.id,
        wasExisting: true,
        error: updateError.message,
      }
    }

    return {
      success: true,
      userId: clerkUserData.id,
      wasExisting: true,
    }
  }

  // Create new user
  const { error: insertError } = await supabase.from("users").insert({
    id: clerkUserData.id,
    email: email,
    display_name: displayName,
    avatar_url: clerkUserData.imageUrl || null,
    credits: 10, // Give new users 10 free credits
    subscription_tier: "free",
    subscription_status: "active",
    created_at: new Date(clerkUserData.createdAt).toISOString(),
    updated_at: new Date().toISOString(),
  })

  if (insertError) {
    console.error("[sync-clerk-user] Error inserting user:", insertError)
    return {
      success: false,
      userId: clerkUserData.id,
      wasExisting: false,
      error: insertError.message,
    }
  }

  return {
    success: true,
    userId: clerkUserData.id,
    wasExisting: false,
  }
}

