'use client'

import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Header from '@/components/header'
import Footer from '@/components/footer'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

const SUBSCRIPTION_PLANS = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: 9.99,
    credits: 1000,
    period: 'month',
    description: 'Perfect for regular creators',
    popular: false,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: 99.9,
    originalPrice: 119.88,
    credits: 12000,
    period: 'year',
    description: 'Best value - 20% off',
    popular: true,
    discount: '20% OFF',
  },
]

export default function BillingPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()
  const supabase = createBrowserClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()
  }, [])

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      router.push(`/auth/login?redirect=/billing&plan=${planId}`)
      return
    }

    console.log('[v0] User is authenticated, proceeding with subscription:', planId)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 flex-1">
        <div className="text-center space-y-2 mb-12">
          <h1 className="text-4xl font-bold text-foreground">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground">
            Subscribe to generate unlimited AI conversations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 transition-all ${
                plan.popular
                  ? 'border-primary bg-gradient-to-br from-primary/5 to-accent/5 shadow-lg scale-105'
                  : 'border-border bg-white'
              } overflow-hidden`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-accent text-white text-sm font-semibold px-6 py-2 rounded-bl-lg">
                  {plan.discount}
                </div>
              )}

              <div className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-5xl font-bold text-foreground">${plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                  {plan.originalPrice && (
                    <p className="text-sm text-muted-foreground line-through">
                      ${plan.originalPrice}/{plan.period}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.credits.toLocaleString()} credits per {plan.period}
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setSelectedPlan(plan.id)
                    handleSubscribe(plan.id)
                  }}
                  className={
                    plan.popular
                      ? 'w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg'
                      : 'w-full h-12 text-lg'
                  }
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {selectedPlan === plan.id ? 'Selected' : 'Get Started'}
                </Button>

                <div className="space-y-3 border-t border-border pt-6">
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-foreground">
                      {plan.credits.toLocaleString()} conversation generations
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-foreground">Unlimited custom personas</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-foreground">Publish & share conversations</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-foreground">Priority support</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-foreground">Cancel anytime</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6 space-y-4 max-w-2xl mx-auto">
          <h3 className="font-semibold text-blue-900">Subscription Benefits</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Credits automatically renew each billing period</li>
            <li>• Unused credits roll over to next month (up to 2x your plan limit)</li>
            <li>• New users get 10 free credits to start</li>
            <li>• Upgrade or downgrade anytime without losing credits</li>
          </ul>
        </div>

        <div className="text-center mt-8">
          <Link href="/">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              ← Back to Home
            </Button>
          </Link>
        </div>
      </div>

      <Footer />
    </div>
  )
}
