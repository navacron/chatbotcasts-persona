export interface SubscriptionPlan {
  id: string
  name: string
  stripePriceId: string | null // null for free plan
  price: number
  credits: number
  period: 'month' | 'year'
  description: string
  popular: boolean
  discount?: string
  originalPrice?: number
  features: string[]
}

// TODO: Replace these with your actual Stripe Price IDs from your Stripe Dashboard
// Find them at: https://dashboard.stripe.com/products
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Free',
    stripePriceId: null,
    price: 0,
    credits: 10,
    period: 'month',
    description: 'Get started for free',
    popular: false,
    features: [
      '10 conversation generations',
      'Basic personas',
      'View public conversations',
      'Community support',
    ],
  },
  {
    id: 'monthly',
    name: 'Monthly',
    stripePriceId: 'price_1SUCI6Re0RKUVeZ91Da3EcwL', // TODO: Replace with your Stripe monthly price ID
    price: 9.99,
    credits: 1000,
    period: 'month',
    description: 'Perfect for regular creators',
    popular: false,
    features: [
      '1,000 conversation generations',
      'Unlimited custom personas',
      'Publish & share conversations',
      'Priority support',
      'Cancel anytime',
    ],
  },
  {
    id: 'yearly',
    name: 'Yearly',
    stripePriceId: 'price_1SUCPURe0RKUVeZ9RuwoJjjC', // TODO: Replace with your Stripe yearly price ID
    price: 99.9,
    originalPrice: 119.88,
    credits: 12000,
    period: 'year',
    description: 'Best value - 20% off',
    popular: true,
    discount: '20% OFF',
    features: [
      '12,000 conversation generations',
      'Unlimited custom personas',
      'Publish & share conversations',
      'Priority support',
      'Cancel anytime',
      '2 months free',
    ],
  },
]
