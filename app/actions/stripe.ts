'use server'

import { stripe } from '@/lib/stripe'
import { SUBSCRIPTION_PLANS } from '@/lib/products'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function startCheckoutSession(planId: string) {
  const supabase = await createClient()
  
  // Check if user is authenticated
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error('You must be logged in to subscribe')
  }

  // Find the plan
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId)
  if (!plan) {
    throw new Error(`Plan with id "${planId}" not found`)
  }

  // Handle free plan
  if (plan.stripePriceId === null) {
    // Free plan - just update the user's credits in the database
    // No Stripe checkout needed
    return { type: 'free' as const, success: true }
  }

  // Create Stripe Checkout Session for paid plans
  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    redirect_on_completion: 'never',
    line_items: [
      {
        price: plan.stripePriceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    customer_email: user.email,
    metadata: {
      userId: user.id,
      planId: plan.id,
    },
  })

  return { type: 'checkout' as const, clientSecret: session.client_secret! }
}
