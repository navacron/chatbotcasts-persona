import { Webhook } from "svix"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

// Use subscription-specific webhook secret if available, otherwise fall back to general webhook secret
const webhookSecret = process.env.CLERK_WEBHOOK_SUBSCRIPTION_SECRET || process.env.CLERK_WEBHOOK_SECRET!

if (!webhookSecret) {
  console.error("[clerk-subscription-webhook] Missing webhook secret! Set CLERK_WEBHOOK_SUBSCRIPTION_SECRET or CLERK_WEBHOOK_SECRET")
}

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
    if (!webhookSecret) {
      console.error("[clerk-subscription-webhook] Webhook secret is missing")
      return new NextResponse("Webhook secret not configured", {
        status: 500,
      })
    }
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as any
  } catch (err) {
    console.error("[clerk-subscription-webhook] Error verifying webhook:", err)
    console.error("[clerk-subscription-webhook] Webhook secret configured:", !!webhookSecret)
    console.error("[clerk-subscription-webhook] Headers received:", {
      svix_id: !!svix_id,
      svix_timestamp: !!svix_timestamp,
      svix_signature: !!svix_signature,
    })
    return new NextResponse("Error occurred", {
      status: 400,
    })
  }

  const supabase = createServiceClient()
  const eventType = evt.type

  console.log("[clerk-subscription-webhook] Event type:", eventType)
  console.log("[clerk-subscription-webhook] Event data:", JSON.stringify(evt.data, null, 2))

  // Handle subscription events
  if (
    eventType === "subscription.created" ||
    eventType === "subscription.updated" ||
    eventType === "subscription.active"
  ) {
    const { user_id, plan_id, status, id: subscription_id } = evt.data

    if (!user_id) {
      console.error("[clerk-subscription-webhook] No user_id in subscription event")
      return NextResponse.json({ error: "No user_id in subscription event" }, { status: 400 })
    }

    // Determine credit limit based on plan
    // Free plan: 10 credits/month
    // Any paid plan: 1000 credits/month
    const isSubscribed = plan_id && plan_id !== "free"
    const monthlyCreditLimit = isSubscribed ? 1000 : 10

    // Update user subscription info
    const { error: updateError } = await supabase
      .from("users")
      .update({
        clerk_subscription_id: subscription_id,
        clerk_plan_id: plan_id || "free",
        subscription_status: status || "active",
        monthly_credit_limit: monthlyCreditLimit,
        // Reset credits to new limit on subscription change
        credits: monthlyCreditLimit,
        credits_used_this_month: 0,
        last_credit_reset: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id)

    if (updateError) {
      console.error("[clerk-subscription-webhook] Error updating user:", updateError)
      return NextResponse.json(
        { error: "Failed to update user subscription", details: updateError.message },
        { status: 500 }
      )
    }

    console.log(
      `[clerk-subscription-webhook] Updated user ${user_id}: plan=${plan_id}, credits=${monthlyCreditLimit}`
    )

    return NextResponse.json({
      success: true,
      userId: user_id,
      planId: plan_id,
      monthlyCreditLimit,
    })
  }

  // Handle subscription past due
  if (eventType === "subscription.pastDue") {
    const { user_id, status } = evt.data

    if (!user_id) {
      console.error("[clerk-subscription-webhook] No user_id in past due event")
      return NextResponse.json({ error: "No user_id in past due event" }, { status: 400 })
    }

    // Update subscription status but don't change credit limit
    const { error: updateError } = await supabase
      .from("users")
      .update({
        subscription_status: status || "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id)

    if (updateError) {
      console.error("[clerk-subscription-webhook] Error updating user on past due:", updateError)
      return NextResponse.json(
        { error: "Failed to update user on past due", details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`[clerk-subscription-webhook] Updated user ${user_id} to past_due status`)

    return NextResponse.json({
      success: true,
      userId: user_id,
      status: "past_due",
    })
  }

  // Handle subscription item ended (this is when a subscription period ends, often triggering renewal)
  // When a subscription item ends, a new one is usually created, which triggers subscriptionItem.created
  if (eventType === "subscriptionItem.ended") {
    const { user_id, plan_id } = evt.data

    if (!user_id) {
      console.error("[clerk-subscription-webhook] No user_id in subscriptionItem.ended event")
      return NextResponse.json({ error: "No user_id in subscriptionItem.ended event" }, { status: 400 })
    }

    // Get current user to check their plan
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("monthly_credit_limit, clerk_plan_id, subscription_status")
      .eq("id", user_id)
      .single()

    if (userError || !user) {
      console.error("[clerk-subscription-webhook] Error fetching user:", userError)
      return NextResponse.json(
        { error: "Failed to fetch user", details: userError?.message },
        { status: 500 }
      )
    }

    // Only reset credits if subscription is still active (not canceled)
    // If subscription was canceled, don't reset credits
    if (user.subscription_status === "canceled" || user.clerk_plan_id === "free") {
      console.log(
        `[clerk-subscription-webhook] Subscription ended for user ${user_id}, but subscription is canceled/free - not resetting credits`
      )
      return NextResponse.json({
        success: true,
        userId: user_id,
        message: "Subscription ended but user is on free plan - credits not reset",
      })
    }

    const monthlyCreditLimit = user.monthly_credit_limit || 1000

    // Reset monthly credits when subscription period ends (renewal)
    const { error: updateError } = await supabase
      .from("users")
      .update({
        credits: monthlyCreditLimit,
        credits_used_this_month: 0,
        last_credit_reset: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id)

    if (updateError) {
      console.error("[clerk-subscription-webhook] Error updating credits on renewal:", updateError)
      return NextResponse.json(
        { error: "Failed to update credits on renewal", details: updateError.message },
        { status: 500 }
      )
    }

    console.log(
      `[clerk-subscription-webhook] Renewed credits for user ${user_id}: ${monthlyCreditLimit} credits`
    )

    return NextResponse.json({
      success: true,
      userId: user_id,
      creditsAdded: monthlyCreditLimit,
    })
  }

  // Handle subscription item created (new subscription or renewal)
  if (eventType === "subscriptionItem.created" || eventType === "subscriptionItem.active") {
    const { user_id, plan_id, subscription_id } = evt.data

    if (!user_id) {
      console.error("[clerk-subscription-webhook] No user_id in subscriptionItem event")
      return NextResponse.json({ error: "No user_id in subscriptionItem event" }, { status: 400 })
    }

    // Determine credit limit based on plan
    const isSubscribed = plan_id && plan_id !== "free"
    const monthlyCreditLimit = isSubscribed ? 1000 : 10

    // Update user subscription info and reset credits
    const { error: updateError } = await supabase
      .from("users")
      .update({
        clerk_subscription_id: subscription_id,
        clerk_plan_id: plan_id || "free",
        subscription_status: "active",
        monthly_credit_limit: monthlyCreditLimit,
        credits: monthlyCreditLimit,
        credits_used_this_month: 0,
        last_credit_reset: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id)

    if (updateError) {
      console.error("[clerk-subscription-webhook] Error updating user on subscriptionItem:", updateError)
      return NextResponse.json(
        { error: "Failed to update user subscription", details: updateError.message },
        { status: 500 }
      )
    }

    console.log(
      `[clerk-subscription-webhook] Updated user ${user_id} on subscriptionItem: plan=${plan_id}, credits=${monthlyCreditLimit}`
    )

    return NextResponse.json({
      success: true,
      userId: user_id,
      planId: plan_id,
      monthlyCreditLimit,
    })
  }

  // Handle subscription item canceled
  if (eventType === "subscriptionItem.canceled") {
    const { user_id } = evt.data

    if (!user_id) {
      console.error("[clerk-subscription-webhook] No user_id in cancellation event")
      return NextResponse.json({ error: "No user_id in cancellation event" }, { status: 400 })
    }

    // Downgrade to free plan
    const { error: updateError } = await supabase
      .from("users")
      .update({
        clerk_subscription_id: null,
        clerk_plan_id: "free",
        subscription_status: "canceled",
        monthly_credit_limit: 10,
        // Don't change current credits, just update limit for next month
        updated_at: new Date().toISOString(),
      })
      .eq("id", user_id)

    if (updateError) {
      console.error("[clerk-subscription-webhook] Error updating user on cancellation:", updateError)
      return NextResponse.json(
        { error: "Failed to update user on cancellation", details: updateError.message },
        { status: 500 }
      )
    }

    console.log(`[clerk-subscription-webhook] Downgraded user ${user_id} to free plan`)

    return NextResponse.json({
      success: true,
      userId: user_id,
      planId: "free",
    })
  }

  return NextResponse.json({ received: true, eventType })
}

