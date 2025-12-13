/**
 * Utility function to sync Clerk user to public.users table
 * This ensures a user record exists in public.users when they sign up via Clerk
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export interface ClerkUserData {
  id: string
  emailAddresses: Array<{ email_address: string } | { emailAddress: string }>
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

  // Log the Clerk user ID being used
  console.log("[sync-clerk-user] ========================================")
  console.log("[sync-clerk-user] Clerk User ID from webhook:", clerkUserData.id)
  console.log("[sync-clerk-user] This ID should match:")
  console.log("[sync-clerk-user]   - Clerk Dashboard → Users → [Your User] → User ID")
  console.log("[sync-clerk-user]   - Format: 'user_...' (starts with 'user_')")
  console.log("[sync-clerk-user] ========================================")

  // Handle both possible email field names (emailAddress or email_address)
  // Clerk webhooks use email_address (snake_case)
  const emailAddressObj = clerkUserData.emailAddresses[0]
  const email =
    (emailAddressObj as any)?.email_address || (emailAddressObj as any)?.emailAddress

  if (!email) {
    console.error("[sync-clerk-user] No email found in:", {
      emailAddresses: clerkUserData.emailAddresses,
      firstItem: clerkUserData.emailAddresses[0],
      userId: clerkUserData.id,
    })
    return {
      success: false,
      userId: clerkUserData.id,
      wasExisting: false,
      error: "No email address found in user data",
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
    // Build update object dynamically to handle missing columns
    const updateData: any = {
      id: clerkUserData.id, // Update ID to Clerk user ID
      email: email,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    }
    
    // Only include avatar_url if imageUrl is provided (handles missing column gracefully)
    if (clerkUserData.imageUrl) {
      updateData.avatar_url = clerkUserData.imageUrl
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updateData)
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
    // Build update object dynamically to handle missing columns
    const updateData: any = {
      email: email,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    }
    
    // Only include avatar_url if imageUrl is provided (handles missing column gracefully)
    if (clerkUserData.imageUrl) {
      updateData.avatar_url = clerkUserData.imageUrl
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updateData)
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
  // Build insert object with only required/guaranteed columns first
  const insertData: any = {
    id: clerkUserData.id,
    email: email,
    display_name: displayName,
    credits: 10, // Give new users 10 free credits
    created_at: new Date(clerkUserData.createdAt).toISOString(),
    updated_at: new Date().toISOString(),
  }
  
  // Only include optional columns if data is provided
  if (clerkUserData.imageUrl) {
    insertData.avatar_url = clerkUserData.imageUrl
  }
  
  // Try to include subscription fields (they might not exist if migration hasn't been run)
  // We'll try with them first, then retry without if they don't exist
  insertData.monthly_credit_limit = 10 // Free users get 10 credits/month
  insertData.credits_used_this_month = 0
  insertData.last_credit_reset = new Date().toISOString()
  insertData.clerk_plan_id = "free" // Default to free plan
  insertData.subscription_status = "active"
  
  let { error: insertError } = await supabase.from("users").insert(insertData)
  
  // If insert failed due to missing subscription columns, retry without them
  if (insertError && (insertError.code === "PGRST204" || insertError.message?.includes("subscription") || insertError.message?.includes("monthly_credit_limit"))) {
    console.log("[sync-clerk-user] Subscription columns not found, retrying without them:", insertError.message)
    // Remove subscription fields and retry
    delete insertData.monthly_credit_limit
    delete insertData.credits_used_this_month
    delete insertData.last_credit_reset
    delete insertData.clerk_plan_id
    delete insertData.subscription_status
    
    const retryResult = await supabase.from("users").insert(insertData)
    insertError = retryResult.error
    
    if (!insertError) {
      console.log("[sync-clerk-user] User created successfully without subscription fields")
    }
  }

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

