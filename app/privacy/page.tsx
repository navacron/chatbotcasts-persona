'use client'

import Header from '@/components/header'
import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="space-y-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              Privacy Policy
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              How ChatBotCasts collects, uses, and protects your information
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <div className="prose prose-neutral max-w-none space-y-12 text-muted-foreground">
          <section className="space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Last updated: February 2025. ChatBotCasts (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to protecting your privacy. This policy describes how we handle information when you use our platform to create and explore AI-powered persona conversations.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
              <li><strong className="text-foreground">Account information:</strong> When you sign up, we collect your name, email address, and profile data through our authentication provider so you can create conversations, manage personas, and access your dashboard.</li>
              <li><strong className="text-foreground">Content you create:</strong> Conversations, AI personas, and any text or metadata you create on ChatBotCasts are stored to provide the service and, if you choose to publish, to share with the community.</li>
              <li><strong className="text-foreground">Usage data:</strong> We collect information about how you use the site (e.g., pages visited, features used) to improve the product and troubleshoot issues.</li>
              <li><strong className="text-foreground">Billing information:</strong> Payment processing is handled by our payment provider. We do not store full payment card details on our servers.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use your information to operate and improve ChatBotCasts, including to provide multi-persona conversation creation, custom personas, and community features; to communicate with you about your account and the service; to analyze usage (e.g., via analytics tools) to improve our product; and to comply with legal obligations.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Cookies and Analytics</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar technologies for authentication, preferences, and analytics. Our site may use third-party analytics services to understand how visitors use ChatBotCasts. You can control cookie preferences through your browser settings.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Third-Party Services</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use trusted third parties to run ChatBotCasts, including for authentication, hosting, payment processing, and analytics. These providers process data in accordance with their own privacy policies and our agreements with them.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Data Security and Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We take reasonable steps to protect your data and use industry-standard practices for hosting and transmission. We retain your information for as long as your account is active or as needed to provide the service and fulfill the purposes described in this policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Depending on where you live, you may have rights to access, correct, delete, or port your personal data, or to object to or restrict certain processing. To exercise these rights or ask questions about your data, contact us at{' '}
              <a href="mailto:hello@chatbotcasts.com" className="text-primary hover:underline">hello@chatbotcasts.com</a>.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Changes</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this privacy policy from time to time. We will post the updated policy on this page and indicate the date of the last update. Continued use of ChatBotCasts after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy-related questions or requests, contact us at{' '}
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
