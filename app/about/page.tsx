'use client'

import Header from '@/components/header'
import { Button } from '@/components/ui/button'
import { MessageSquare, Sparkles, Users, Zap } from 'lucide-react'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 md:py-24">
          <div className="space-y-6 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">
              About ChatBotCasts
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Revolutionizing conversations through AI-powered persona interactions
            </p>
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
        <div className="space-y-16">
          {/* Mission */}
          <div className="space-y-4">
            <h2 className="text-3xl font-bold text-foreground">Our Mission</h2>
            <p className="text-lg text-muted-foreground leading-relaxed">
              ChatBotCasts empowers creators, researchers, and educators to explore ideas through dynamic multi-perspective conversations. By combining AI personas with innovative conversation generation, we make it easy for anyone to create compelling dialogues that challenge thinking and spark creativity.
            </p>
          </div>

          {/* Core Features */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-foreground">What Makes Us Different</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Multi-Persona Conversations</h3>
                </div>
                <p className="text-muted-foreground">
                  Create dynamic discussions between multiple AI personas, each with unique perspectives and expertise.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Full Creative Control</h3>
                </div>
                <p className="text-muted-foreground">
                  Edit individual responses, choose conversation flow, and refine every aspect of your dialogue.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Custom Personas</h3>
                </div>
                <p className="text-muted-foreground">
                  Create and publish your own AI personas with unique personalities, knowledge, and perspectives.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-orange-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Community-Driven</h3>
                </div>
                <p className="text-muted-foreground">
                  Discover personas and conversations created by the community, or share your creations with the world.
                </p>
              </div>
            </div>
          </div>

          {/* Use Cases */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-foreground">Use Cases</h2>
            <div className="space-y-4">
              <div className="p-6 border border-border rounded-lg bg-secondary/30">
                <h3 className="font-semibold text-foreground mb-2">Content Creation</h3>
                <p className="text-muted-foreground">
                  Generate podcast scripts, interview content, and dialogue-heavy materials that engage audiences.
                </p>
              </div>

              <div className="p-6 border border-border rounded-lg bg-secondary/30">
                <h3 className="font-semibold text-foreground mb-2">Education & Learning</h3>
                <p className="text-muted-foreground">
                  Create educational dialogues that explore complex topics from multiple perspectives and viewpoints.
                </p>
              </div>

              <div className="p-6 border border-border rounded-lg bg-secondary/30">
                <h3 className="font-semibold text-foreground mb-2">Research & Analysis</h3>
                <p className="text-muted-foreground">
                  Explore ideas systematically through conversations that challenge assumptions and uncover insights.
                </p>
              </div>

              <div className="p-6 border border-border rounded-lg bg-secondary/30">
                <h3 className="font-semibold text-foreground mb-2">Entertainment</h3>
                <p className="text-muted-foreground">
                  Bring characters to life with unique personalities and let them discuss topics that captivate listeners.
                </p>
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-foreground">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Creativity</h3>
                <p className="text-muted-foreground">
                  We empower users to explore unlimited creative possibilities through conversational AI.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Accessibility</h3>
                <p className="text-muted-foreground">
                  Making advanced AI capabilities available to everyone, regardless of technical background.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground">Community</h3>
                <p className="text-muted-foreground">
                  Building a vibrant ecosystem where creators share, collaborate, and inspire one another.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Create?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start creating engaging multi-persona conversations today. Join thousands of creators exploring ideas through ChatBotCasts.
          </p>
          <Link href="/create">
            <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
              Get Started Free
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
