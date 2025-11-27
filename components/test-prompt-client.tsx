"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Send, Trash2, Sparkles, Loader2, Code, ExternalLink } from "lucide-react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  citations?: string[]
  createdAt: Date
}

interface DebugInfo {
  request: {
    messages: Message[]
    timestamp: string
  }
  response: {
    text: string
    citations?: string[]
    timestamp: string
    usage?: any
    finishReason?: string
  }
}

export default function TestPromptClient() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [showDebug, setShowDebug] = useState(false)

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      createdAt: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    const requestPayload = [...messages, userMessage].map((m) => ({
      role: m.role,
      content: m.content,
    }))

    setDebugInfo({
      request: {
        messages: [...messages, userMessage],
        timestamp: new Date().toISOString(),
      },
      response: {
        text: "",
        timestamp: "",
      },
    })

    try {
      const response = await fetch("/api/ai/perplexity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: requestPayload,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.text,
        citations: data.citations || [],
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])

      setDebugInfo((prev) => ({
        request: prev!.request,
        response: {
          text: data.text,
          citations: data.citations || [],
          timestamp: new Date().toISOString(),
          usage: data.usage,
          finishReason: data.finishReason,
        },
      }))
    } catch (error) {
      console.error("[v0] Error sending message:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, there was an error processing your request.",
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
    setDebugInfo(null)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Test Perplexity Sonar</h1>
          <p className="text-muted-foreground">Test prompts with the Perplexity Sonar model to see how it responds</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)}>
            <Code className="h-4 w-4 mr-2" />
            {showDebug ? "Hide" : "Show"} Debug Info
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Conversation
                </CardTitle>
                <CardDescription>
                  Chat with Perplexity Sonar - your messages are sent with full chat history
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
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-3 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-background border border-border"
                          }`}
                        >
                          <p className="text-sm font-medium mb-1">
                            {message.role === "user" ? "You" : "Perplexity Sonar"}
                          </p>
                          <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                          {message.citations && message.citations.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-xs font-medium mb-2 text-muted-foreground">Sources:</p>
                              <div className="space-y-1">
                                {message.citations.map((citation, idx) => (
                                  <a
                                    key={idx}
                                    href={citation}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {citation}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClear}
                      disabled={messages.length === 0 || isLoading}
                    >
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

          {showDebug && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Debug Information
                  </CardTitle>
                  <CardDescription>Request and response details for debugging</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {debugInfo ? (
                    <>
                      <div>
                        <h3 className="text-sm font-semibold mb-2">Request Payload</h3>
                        <div className="bg-secondary/50 rounded-md p-3 overflow-auto max-h-[300px]">
                          <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                            {JSON.stringify(
                              {
                                timestamp: debugInfo.request.timestamp,
                                messageCount: debugInfo.request.messages.length,
                                messages: debugInfo.request.messages.map((m) => ({
                                  role: m.role,
                                  content: m.content,
                                  ...(m.citations && m.citations.length > 0 ? { citations: m.citations } : {}),
                                })),
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold mb-2">Response</h3>
                        <div className="bg-secondary/50 rounded-md p-3 overflow-auto max-h-[400px]">
                          <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                            {JSON.stringify(
                              {
                                timestamp: debugInfo.response.timestamp,
                                textLength: debugInfo.response.text.length,
                                citations: debugInfo.response.citations || [],
                                usage: debugInfo.response.usage,
                                finishReason: debugInfo.response.finishReason,
                                fullText: debugInfo.response.text,
                              },
                              null,
                              2,
                            )}
                          </pre>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Send a message to see debug information
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
