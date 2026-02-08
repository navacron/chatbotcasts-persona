'use client'

import Header from '@/components/header'
import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="space-y-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Terms of Service
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Rules and guidelines for using ChatBotCasts
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <div className="prose prose-neutral max-w-none space-y-12 text-muted-foreground">
          <section className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Last updated: February 2025. By using ChatBotCasts (&quot;the Service&quot;), you agree to these Terms of Service. If you do not agree, please do not use the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Acceptance and Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 13 years old (or the minimum age in your jurisdiction) to use ChatBotCasts. By creating an account, you represent that you meet these requirements and that the information you provide is accurate. You are responsible for keeping your account credentials secure.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Use of the Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              ChatBotCasts allows you to create and explore conversations between AI personas, build custom personas, and share content with the community. You may use the Service for content creation, education, research, and entertainment in accordance with these terms and applicable law.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to use the Service to: (a) violate any law or third-party rights; (b) create or share content that is harmful, harassing, defamatory, or otherwise objectionable; (c) impersonate others or misuse the AI personas in a way that could deceive or harm; (d) attempt to reverse-engineer, overload, or disrupt the Service; or (e) resell or commercially exploit the Service beyond normal use without our permission.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Your Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of the conversations and personas you create. By publishing content on ChatBotCasts, you grant us a license to host, display, and distribute that content in connection with operating the Service and the community features. You are responsible for ensuring you have the rights to any content you upload or generate and that it does not infringe others&apos; rights.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Subscription and Billing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Paid plans and credits are subject to the pricing and billing terms presented at the time of purchase. Fees are charged in advance (e.g., monthly or annually). Refunds are handled according to our billing policy. We may change pricing with reasonable notice; continued use after a change constitutes acceptance.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              ChatBotCasts and its branding, design, and technology (other than your content) are owned by us or our licensors. You may not copy, modify, or create derivative works of the Service or use our trademarks without written permission.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Disclaimers</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is provided &quot;as is.&quot; AI-generated content may be inaccurate or inappropriate; you use it at your own risk. We do not guarantee uninterrupted or error-free service. We are not liable for how you or others use the content created on ChatBotCasts.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the fullest extent permitted by law, ChatBotCasts and its affiliates shall not be liable for any indirect, incidental, special, or consequential damages, or for any loss of data, revenue, or profits, arising from your use of the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your access to the Service if you breach these terms or for other operational or legal reasons. You may close your account at any time. Upon termination, your right to use the Service ends; we may retain and use data as described in our Privacy Policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Changes to the Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms of Service from time to time. We will post the updated terms on this page and update the &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes acceptance. If you do not agree, you must stop using the Service.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these terms, contact us at{' '}
              <a href="mailto:hello@chatbotcasts.com" className="text-primary hover:underline">hello@chatbotcasts.com</a>.
            </p>
          </section>
        </div>
      </div>

      {/* Back link */}
      <div className="border-t border-border py-8">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
