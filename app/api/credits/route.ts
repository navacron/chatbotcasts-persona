/**
 * API route to get user's current credit status
 */

import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = createServiceClient()

    // Get user's credit information
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(
        "credits, monthly_credit_limit, credits_used_this_month, clerk_plan_id, subscription_status, last_credit_reset"
      )
      .eq("id", userId)
      .single()

    if (userError || !user) {
      console.error("[credits-api] Error fetching user:", userError)
      return NextResponse.json(
        { error: "Failed to fetch credit information" },
        { status: 500 }
      )
    }

    // Get available credits using the function (handles monthly reset)
    const { data: availableCredits, error: creditsError } = await supabase.rpc(
      "get_available_credits",
      {
        p_user_id: userId,
      }
    )

    if (creditsError) {
      console.error("[credits-api] Error getting available credits:", creditsError)
    }

    return NextResponse.json({
      availableCredits: availableCredits || 0,
      monthlyLimit: user.monthly_credit_limit || 10,
      creditsUsed: user.credits_used_this_month || 0,
      planId: user.clerk_plan_id || "free",
      subscriptionStatus: user.subscription_status || "active",
      lastReset: user.last_credit_reset,
      isSubscribed: user.clerk_plan_id && user.clerk_plan_id !== "free",
    })
  } catch (error) {
    console.error("[credits-api] Unexpected error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    )
  }
}

