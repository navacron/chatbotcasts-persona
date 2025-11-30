"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import Footer from "@/components/footer"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { SUBSCRIPTION_PLANS } from "@/lib/products"
import { startCheckoutSession } from "@/app/actions/stripe"
import StripeCheckout from "@/components/stripe-checkout"

export const dynamic = "force-dynamic"

export default function BillingPage() {
  const [loading, setLoading] = useState(false)
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null)
  const router = useRouter()
  const { user, isLoaded } = useUser()

  const handleSelectPlan = async (planId: string) => {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId)
    if (!plan) return

    if (plan.stripePriceId === null) {
      if (!user) {
        router.push(`/`)
        return
      }
      // Handle free plan signup
      alert("You are now on the free plan with 10 credits!")
      return
    }

    if (!user) {
      router.push(`/`)
      return
    }

    setLoading(true)
    try {
      const result = await startCheckoutSession(planId)

      if (result.type === "free") {
        alert("You are now on the free plan!")
      } else if (result.type === "checkout") {
        setCheckoutClientSecret(result.clientSecret)
      }
    } catch (error) {
      console.error("[v0] Error starting checkout:", error)
      alert("Failed to start checkout. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (checkoutClientSecret) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 flex-1">
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-4xl font-bold text-foreground">Complete Your Subscription</h1>
            <p className="text-lg text-muted-foreground">You're one step away from unlimited AI conversations</p>
          </div>

          <StripeCheckout clientSecret={checkoutClientSecret} />

          <div className="text-center mt-8">
            <Button
              variant="ghost"
              onClick={() => setCheckoutClientSecret(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              ← Back to Plans
            </Button>
          </div>
        </div>

        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 flex-1">
        <div className="text-center space-y-2 mb-12">
          <h1 className="text-4xl font-bold text-foreground">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground">Start free or subscribe for unlimited AI conversations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 transition-all ${
                plan.popular
                  ? "border-primary bg-gradient-to-br from-primary/5 to-accent/5 shadow-lg scale-105"
                  : "border-border bg-white"
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
                    <span className="text-5xl font-bold text-foreground">${plan.price === 0 ? "0" : plan.price}</span>
                    {plan.price > 0 && <span className="text-muted-foreground">/{plan.period}</span>}
                  </div>
                  {plan.originalPrice && (
                    <p className="text-sm text-muted-foreground line-through">
                      ${plan.originalPrice}/{plan.period}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground mt-2">
                    {plan.credits.toLocaleString()} credits {plan.price > 0 ? `per ${plan.period}` : "to start"}
                  </p>
                </div>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading}
                  className={
                    plan.popular
                      ? "w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-lg"
                      : "w-full h-12 text-lg"
                  }
                  variant={plan.popular ? "default" : plan.price === 0 ? "outline" : "default"}
                >
                  {loading ? "Loading..." : "Get Started"}
                </Button>

                <div className="space-y-3 border-t border-border pt-6">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </div>
                  ))}
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
