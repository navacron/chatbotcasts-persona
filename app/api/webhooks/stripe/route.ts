import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  console.log('[v0] Stripe webhook received')
  
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    console.log('[v0] Webhook event type:', event.type)
  } catch (err) {
    console.error('[v0] Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        console.log('[v0] Checkout completed for session:', session.id)
        
        const userId = session.metadata?.userId
        if (!userId) {
          console.error('[v0] No userId in session metadata')
          break
        }

        const planId = session.metadata?.planId || 'monthly'
        const credits = planId === 'yearly' ? 12000 : 1000
        const amount = (session.amount_total || 0) / 100

        const { error: updateError } = await supabase
          .from('users')
          .update({
            credits: supabase.rpc('increment', { x: credits }),
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_plan: planId,
            subscription_status: 'active',
          })
          .eq('id', userId)

        if (updateError) {
          console.error('[v0] Error updating user:', updateError)
          break
        }

        const { error: billingError } = await supabase
          .from('billing_history')
          .insert({
            user_id: userId,
            stripe_subscription_id: session.subscription as string,
            stripe_customer_id: session.customer as string,
            stripe_payment_intent_id: session.payment_intent as string,
            amount,
            credits_added: credits,
            plan_name: planId,
            status: 'completed',
            description: `Subscribed to ${planId} plan`,
            metadata: {
              session_id: session.id,
            },
          })

        if (billingError) {
          console.error('[v0] Error recording billing history:', billingError)
        }

        console.log('[v0] Successfully added', credits, 'credits to user', userId)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('[v0] Invoice payment succeeded:', invoice.id)
        
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
        const customerId = invoice.customer as string

        const { data: userData } = await supabase
          .from('users')
          .select('id, subscription_plan')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!userData) {
          console.error('[v0] No user found for customer:', customerId)
          break
        }

        const planId = userData.subscription_plan || 'monthly'
        const credits = planId === 'yearly' ? 12000 : 1000
        const amount = (invoice.amount_paid || 0) / 100

        const { error: updateError } = await supabase.rpc('increment_credits', {
          user_id: userData.id,
          amount: credits,
        })

        if (updateError) {
          console.error('[v0] Error incrementing credits:', updateError)
        }

        await supabase.from('billing_history').insert({
          user_id: userData.id,
          stripe_subscription_id: subscription.id,
          stripe_customer_id: customerId,
          stripe_payment_intent_id: invoice.payment_intent as string,
          amount,
          credits_added: credits,
          plan_name: planId,
          status: 'completed',
          description: `Subscription renewal - ${planId} plan`,
          metadata: {
            invoice_id: invoice.id,
          },
        })

        console.log('[v0] Subscription renewed, added', credits, 'credits')
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        console.log('[v0] Charge refunded:', charge.id)
        
        const customerId = charge.customer as string
        const refundAmount = (charge.amount_refunded || 0) / 100

        // Get user and find the original billing record
        const { data: userData } = await supabase
          .from('users')
          .select('id, subscription_plan, credits')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!userData) {
          console.error('[v0] No user found for customer:', customerId)
          break
        }

        // Find the original billing record to determine credits to remove
        const { data: originalBilling } = await supabase
          .from('billing_history')
          .select('credits_added')
          .eq('stripe_payment_intent_id', charge.payment_intent as string)
          .single()

        const creditsToRemove = originalBilling?.credits_added || 0

        // Remove credits (ensure it doesn't go below 0)
        const newCredits = Math.max(0, userData.credits - creditsToRemove)
        
        await supabase
          .from('users')
          .update({ credits: newCredits })
          .eq('id', userData.id)

        // Record the refund in billing history
        await supabase.from('billing_history').insert({
          user_id: userData.id,
          stripe_customer_id: customerId,
          stripe_payment_intent_id: charge.payment_intent as string,
          amount: -refundAmount, // Negative amount for refund
          credits_added: -creditsToRemove, // Negative credits
          plan_name: userData.subscription_plan,
          status: 'refunded',
          description: `Refund processed - ${creditsToRemove} credits removed`,
          metadata: {
            charge_id: charge.id,
            original_amount: charge.amount / 100,
          },
        })

        console.log('[v0] Refund processed, removed', creditsToRemove, 'credits from user', userData.id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('[v0] Subscription cancelled:', subscription.id)
        
        await supabase
          .from('users')
          .update({
            subscription_status: 'cancelled',
            stripe_subscription_id: null,
          })
          .eq('stripe_subscription_id', subscription.id)

        console.log('[v0] Subscription status updated to cancelled')
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        console.log('[v0] Subscription updated:', subscription.id)
        
        const status = subscription.status
        
        await supabase
          .from('users')
          .update({
            subscription_status: status,
          })
          .eq('stripe_subscription_id', subscription.id)

        console.log('[v0] Subscription status updated to', status)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.log('[v0] Invoice payment failed:', invoice.id)
        
        await supabase
          .from('users')
          .update({
            subscription_status: 'past_due',
          })
          .eq('stripe_customer_id', invoice.customer as string)

        console.log('[v0] Subscription status updated to past_due')
        break
      }

      default:
        console.log('[v0] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[v0] Error processing webhook:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
