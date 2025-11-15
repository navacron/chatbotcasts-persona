'use client'

import { useState } from 'react'
import { Zap, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Header from '@/components/header'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 50,
    price: 9.99,
    description: 'Perfect for trying out',
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 200,
    price: 29.99,
    description: 'Most popular',
    popular: true,
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    credits: null,
    price: 99.99,
    description: 'Create as much as you want',
    popular: false,
  },
]

const CURRENT_CREDITS = 25

export default function BillingPage() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        {/* Header */}
        <div className="space-y-2 mb-12">
          <h1 className="text-4xl font-bold text-foreground">Buy Credits</h1>
          <p className="text-muted-foreground">
            Purchase credits to create more conversations and generate responses
          </p>
        </div>

        {/* Current Credits */}
        <div className="mb-12 bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-lg p-8">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Zap className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Balance</p>
              <p className="text-4xl font-bold text-foreground">{CURRENT_CREDITS} Credits</p>
            </div>
          </div>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative rounded-xl border-2 transition-all ${
                pkg.popular
                  ? 'border-primary bg-gradient-to-br from-primary/5 to-accent/5 ring-2 ring-primary/20'
                  : 'border-border bg-white'
              } overflow-hidden`}
            >
              {pkg.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-accent text-white text-xs font-semibold px-4 py-1 rounded-bl">
                  Most Popular
                </div>
              )}

              <div className="p-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground">{pkg.description}</p>
                </div>

                <div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-4xl font-bold text-foreground">${pkg.price}</span>
                    <span className="text-muted-foreground">/one-time</span>
                  </div>
                  {pkg.credits ? (
                    <p className="text-sm text-muted-foreground">{pkg.credits} credits</p>
                  ) : (
                    <p className="text-sm text-accent font-semibold">Unlimited credits</p>
                  )}
                </div>

                <Button
                  onClick={() => setSelectedPackage(pkg.id)}
                  className={
                    pkg.popular
                      ? 'w-full bg-gradient-to-r from-primary to-accent hover:opacity-90'
                      : 'w-full'
                  }
                  variant={pkg.popular ? 'default' : 'outline'}
                >
                  {selectedPackage === pkg.id ? 'Selected' : 'Select'} {pkg.name}
                </Button>

                <div className="space-y-3 border-t border-border pt-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-foreground">Generate conversations</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-foreground">Create guests</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-foreground">Publish conversations</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Checkout Section */}
        {selectedPackage && (
          <div className="bg-white border border-border rounded-lg p-8 space-y-6 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground">Checkout</h2>

            <div className="space-y-4 border-t border-b border-border py-6">
              <div className="flex justify-between">
                <span className="text-foreground">
                  {CREDIT_PACKAGES.find((p) => p.id === selectedPackage)?.name} Package
                </span>
                <span className="font-semibold text-foreground">
                  ${CREDIT_PACKAGES.find((p) => p.id === selectedPackage)?.price}
                </span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Processing fee</span>
                <span>$0.00</span>
              </div>
            </div>

            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">
                ${CREDIT_PACKAGES.find((p) => p.id === selectedPackage)?.price}
              </span>
            </div>

            <Button className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90">
              Proceed to Payment
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Payments are processed securely. By purchasing, you agree to our Terms of Service.
            </p>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-blue-900">How Credits Work</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• Each conversation generation uses 1 credit</li>
            <li>• Unused credits never expire</li>
            <li>• New users get 10 free credits to start</li>
            <li>• Earn more credits when your conversations are viewed</li>
          </ul>
        </div>

        {/* Back Link */}
        <div className="text-center mt-8">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
