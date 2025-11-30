import { PricingTable } from "@clerk/nextjs"
import Header from "@/components/header"
import Footer from "@/components/footer"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default function BillingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 flex-1">
        <div className="text-center space-y-2 mb-12">
          <h1 className="text-4xl font-bold text-foreground">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground">Start free or subscribe for unlimited AI conversations</p>
        </div>

        <div className="max-w-5xl mx-auto mb-12">
          <PricingTable />
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
