"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import PersonaSelector from "./persona-selector"
import { Sparkles } from "lucide-react"

interface ConversationSetupProps {
  onStart: (data: any) => void
}

export default function ConversationSetup({ onStart }: ConversationSetupProps) {
  const [topic, setTopic] = useState("")
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>([])

  const handleStart = () => {
    if (topic.trim() && selectedPersonas.length >= 2) {
      onStart({
        topic,
        personas: selectedPersonas,
        turnMode: "manual", // Always use manual mode
        turnCount: 1,
      })
    }
  }

  const isValid = topic.trim() && selectedPersonas.length >= 2

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-white">
      <div className="w-full max-w-3xl space-y-12">
        {/* Header */}
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground">ChatBotCasts</h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Create engaging conversations between AI personas on any topic. Perfect for exploring ideas from multiple
            perspectives.
          </p>
        </div>

        {/* Setup Form */}
        <div className="space-y-8 bg-white border border-border rounded-xl p-8">
          {/* Topic Input */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-foreground">Conversation Topic</label>
            <Input
              placeholder="e.g., The future of artificial intelligence"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-12 text-base bg-white border-border/50 text-foreground placeholder:text-muted-foreground/60"
            />
            <p className="text-xs text-muted-foreground">What would you like the personas to discuss?</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Try:</span>
              {[
                "Plan a 10 Day Trip to France",
                "Book Review of Atomic Habits",
                "Human vs. AI: The Future of Customer Service",
              ].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setTopic(example)}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Persona Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-foreground">
                Select Personas ({selectedPersonas.length})
              </label>
              <span className="text-xs text-muted-foreground">Minimum 2 personas required</span>
            </div>
            <PersonaSelector selected={selectedPersonas} onChange={setSelectedPersonas} />
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStart}
            disabled={!isValid}
            size="lg"
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50"
          >
            Start Conversation
          </Button>
        </div>
      </div>
    </div>
  )
}
