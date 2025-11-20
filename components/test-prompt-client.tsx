"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Trash2, Sparkles, Loader2 } from "lucide-react"
import type { UIMessage } from "ai"

export default function TestPromptClient() {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: UIMessage = {
      id: Date.now().toString(),
      role: "user",
      parts: [{ type: "text", text: input }],
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/ai/perplexity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantText = ""

      const assistantMessage: UIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        parts: [{ type: "text", text: "" }],
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("0:")) {
              try {
                const data = JSON.parse(line.slice(2))
                if (data.textDelta) {
                  assistantText += data.textDelta
                  setMessages((prev) => {
                    const newMessages = [...prev]
                    const lastMsg = newMessages[newMessages.length - 1]
                    if (lastMsg.role === "assistant") {
                      lastMsg.parts = [{ type: "text", text: assistantText }]
                    }
                    return newMessages
                  })
                }
              } catch (e) {
                console.error("[v0] Parse error:", e)
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      const errorMessage: UIMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        parts: [{ type: "text", text: "Sorry, there was an error processing your request." }],
        createdAt: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClear = () => {
    setMessages([])
    setInput("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-12">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Test Perplexity Sonar</h1>
          <p className="text-muted-foreground">Test prompts with the Perplexity Sonar model to see how it responds</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Conversation
            </CardTitle>
            <CardDescription>
              Chat with Perplexity Sonar Pro - your messages are sent with full chat history
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages Display */}
            <div className="space-y-4 min-h-[400px] max-h-[600px] overflow-y-auto bg-secondary/30 rounded-lg p-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Start a conversation by typing a message below</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-background border border-border"
                      }`}
                    >
                      <p className="text-sm font-medium mb-1">{message.role === "user" ? "You" : "Perplexity Sonar"}</p>
                      <div className="whitespace-pre-wrap text-sm">
                        {message.parts.map((part, idx) => (part.type === "text" ? part.text : null))}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-background border border-border rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="space-y-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
                className="min-h-[100px] resize-none"
                disabled={isLoading}
              />
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={handleClear} disabled={messages.length === 0 || isLoading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Chat
                </Button>
                <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About Perplexity Sonar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Perplexity Sonar is a powerful AI model optimized for conversational search and research.</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Real-time web search capabilities</li>
              <li>Citation-backed responses</li>
              <li>Optimized for accuracy and factual information</li>
              <li>Great for research and information retrieval</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
