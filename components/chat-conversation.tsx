"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import ChatMessage from "./chat-message"
import PersonaSwitcher from "./persona-switcher"
import ConversationControls from "./conversation-controls"
import { Send, Share2, Code } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const MOCK_CONVERSATION = [
  {
    id: 1,
    persona: "host",
    name: "ChatBotCast Host",
    message:
      "Welcome everyone! Today we're discussing the future of artificial intelligence. Let's dive into how AI will transform various industries.",
    timestamp: new Date(Date.now() - 5000),
  },
  {
    id: 2,
    persona: "andrew-ng",
    name: "Andrew Ng",
    message:
      "Thanks for having me. I believe the key transformation will come from practical applications. We need to focus on solving real problems rather than just chasing AGI.",
    timestamp: new Date(Date.now() - 4000),
  },
  {
    id: 3,
    persona: "elon-musk",
    name: "Elon Musk",
    message:
      "I think we should consider both timelines. Near-term applications are important, but we also need to think about long-term safety and alignment challenges.",
    timestamp: new Date(Date.now() - 3000),
  },
]

interface ChatConversationProps {
  data: any
  onPublish?: (publishData: any) => void // Updated signature to pass conversation data
}

export default function ChatConversation({ data, onPublish }: ChatConversationProps) {
  const [personaDetails, setPersonaDetails] = useState<any>({})
  const [isLoadingPersonas, setIsLoadingPersonas] = useState(true)

  const [messages, setMessages] = useState<any[]>(() => {
    console.log("[v0] ChatConversation received data:", data)
    if (data?.messages && Array.isArray(data.messages)) {
      return data.messages.map((msg: any, index: number) => ({
        ...msg,
        id: msg.id || index + 1,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      }))
    }
    return []
  })

  const [nextSpeaker, setNextSpeaker] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [turnMode] = useState(data?.turnMode || "manual")
  const [numTurns] = useState(data?.numTurns || 3)
  const [currentCycleIndex, setCurrentCycleIndex] = useState(0)
  const [personas] = useState<string[]>(data?.personas || [])
  const [showDebug, setShowDebug] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const response = await fetch("/api/personas")
        const data = await response.json()

        const allPersonas = [...(data.publicPersonas || []), ...(data.myPersonas || [])]

        const detailsMap: any = {}
        allPersonas.forEach((persona: any) => {
          detailsMap[persona.id] = {
            id: persona.id,
            name: persona.name,
            avatar: getAvatarForPersona(persona.name),
            color: getColorForPersona(persona.name),
            title: persona.name,
          }
        })

        console.log("[v0] Loaded persona details:", detailsMap)
        setPersonaDetails(detailsMap)
      } catch (error) {
        console.error("[v0] Error fetching personas:", error)
      } finally {
        setIsLoadingPersonas(false)
      }
    }

    fetchPersonas()
  }, [])

  const getAvatarForPersona = (name: string): string => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes("andrew")) return "🤖"
    if (lowerName.includes("elon")) return "⚡"
    if (lowerName.includes("sam")) return "🧠"
    if (lowerName.includes("jane")) return "🌍"
    if (lowerName.includes("bill")) return "💡"
    if (lowerName.includes("host")) return "🎙️"
    return "👤"
  }

  const getColorForPersona = (name: string): string => {
    const lowerName = name.toLowerCase()
    if (lowerName.includes("andrew")) return "from-blue-500 to-blue-600"
    if (lowerName.includes("elon")) return "from-orange-500 to-red-600"
    if (lowerName.includes("sam")) return "from-purple-500 to-pink-600"
    if (lowerName.includes("jane")) return "from-green-500 to-emerald-600"
    if (lowerName.includes("bill")) return "from-cyan-500 to-blue-600"
    if (lowerName.includes("host")) return "from-slate-500 to-slate-600"
    return "from-gray-500 to-gray-600"
  }

  const handleEditMessage = (messageId: number, newText: string) => {
    setMessages(messages.map((msg) => (msg.id === messageId ? { ...msg, message: newText } : msg)))
  }

  const handleDeleteMessage = (messageId: number) => {
    setMessages(messages.filter((msg) => msg.id !== messageId))
  }

  const handleSelectSpeaker = (personaId: string) => {
    setNextSpeaker(personaId)
  }

  const handleGenerateResponse = async () => {
    const speakerToUse = nextSpeaker || personas[0]
    setIsGenerating(true)

    try {
      console.log("[v0] Generating response for persona:", speakerToUse)
      console.log("[v0] All personas:", personas)
      console.log("[v0] Chat history:", messages)

      const requestPayload = {
        currentPersonaId: speakerToUse,
        allPersonaIds: personas,
        chatHistory: messages.map((msg) => ({
          personaId: msg.persona,
          message: msg.message,
          timestamp: msg.timestamp,
        })),
        topic: data?.topic || "General Discussion",
      }

      setDebugInfo({
        request: {
          ...requestPayload,
          timestamp: new Date().toISOString(),
        },
        response: null,
      })

      const response = await fetch("/api/generateNextConversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] API error:", errorData)
        setDebugInfo((prev: any) => ({
          ...prev,
          response: {
            error: errorData,
            timestamp: new Date().toISOString(),
          },
        }))
        throw new Error(errorData.error || "Failed to generate response")
      }

      const result = await response.json()
      console.log("[v0] API response:", result)

      setDebugInfo((prev: any) => ({
        ...prev,
        response: {
          ...result,
          timestamp: new Date().toISOString(),
        },
      }))

      const personaDetail = personaDetails[speakerToUse]
      if (!personaDetail) {
        console.error("[v0] No persona details found for:", speakerToUse)
        setIsGenerating(false)
        return
      }

      const maxId = messages.length > 0 ? Math.max(...messages.map((m) => m.id || 0)) : 0
      const newMessage = {
        id: maxId + 1,
        persona: speakerToUse,
        name: personaDetail.name,
        message: result.message,
        citations: result.citations || [],
        timestamp: new Date(result.timestamp),
      }

      setMessages([...messages, newMessage])
      setNextSpeaker(null)

      if (turnMode === "round-robin" || turnMode === "alternating") {
        const nextIndex = (currentCycleIndex + 1) % personas.length
        setCurrentCycleIndex(nextIndex)
        setNextSpeaker(personas[nextIndex])
      }
    } catch (error) {
      console.error("[v0] Error generating response:", error)
      alert("Failed to generate response. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setMessages([])
    setNextSpeaker(null)
    setCurrentCycleIndex(0)
  }

  const handlePublishClick = () => {
    if (onPublish) {
      onPublish({
        messages,
        personas,
        topic: data?.topic || "New Conversation",
        turnMode,
        numTurns,
      })
    }
  }

  if (isLoadingPersonas) {
    return (
      <div className="max-w-4xl mx-auto flex items-center justify-center h-96">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading personas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">{data?.topic || "New Conversation"}</h2>
            <p className="text-muted-foreground">
              {personas.length} personas • Mode: {turnMode}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)}>
              <Code className="h-4 w-4 mr-2" />
              {showDebug ? "Hide" : "Show"} Debug
            </Button>
            {onPublish && (
              <Button
                onClick={handlePublishClick}
                className="bg-gradient-to-r from-accent to-orange-500 hover:opacity-90 whitespace-nowrap"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Publish
              </Button>
            )}
          </div>
        </div>
      </div>

      {showDebug && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              API Debug Information
            </CardTitle>
            <CardDescription>View the request payload and response for each AI generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {debugInfo ? (
              <>
                <div>
                  <h3 className="text-sm font-semibold mb-2">Last Request Payload</h3>
                  <div className="bg-secondary/50 rounded-md p-3 overflow-auto max-h-[300px]">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                      {JSON.stringify(
                        {
                          timestamp: debugInfo.request.timestamp,
                          currentPersonaId: debugInfo.request.currentPersonaId,
                          allPersonaIds: debugInfo.request.allPersonaIds,
                          topic: debugInfo.request.topic,
                          chatHistoryLength: debugInfo.request.chatHistory?.length || 0,
                          chatHistory: debugInfo.request.chatHistory,
                        },
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2">Last Response</h3>
                  <div className="bg-secondary/50 rounded-md p-3 overflow-auto max-h-[300px]">
                    <pre className="text-xs font-mono whitespace-pre-wrap break-words">
                      {JSON.stringify(debugInfo.response, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Generate a response to see debug information
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="bg-white border border-border rounded-xl overflow-hidden flex flex-col h-96">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              personaDetails={
                personaDetails[msg.persona] || { name: "Unknown", avatar: "👤", color: "from-gray-500 to-gray-600" }
              }
              onEdit={(id, text) => {
                setMessages(messages.map((m) => (m.id === id ? { ...m, message: text } : m)))
              }}
              onDelete={(id) => {
                setMessages(messages.filter((m) => m.id !== id))
              }}
            />
          ))}
          {isGenerating && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm flex-shrink-0">
                ✨
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                <div className="h-2 w-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }}></div>
              </div>
            </div>
          )}
          {messages.length === 0 && !isGenerating && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Start the conversation by generating the first response</p>
            </div>
          )}
        </div>

        <div className="border-t border-border bg-background p-4 space-y-4">
          {turnMode === "manual" && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">Select who speaks next:</p>
              <PersonaSwitcher
                personas={personas}
                selected={nextSpeaker}
                onSelect={handleSelectSpeaker}
                personaDetails={personaDetails}
              />
            </div>
          )}

          <Button
            onClick={handleGenerateResponse}
            disabled={isGenerating || (turnMode === "manual" && !nextSpeaker)}
            className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4 mr-2" />
            {isGenerating ? "Generating..." : "Generate Response"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Participants</h3>
          <div className="space-y-2">
            {personas.map((personaId: string) => {
              const detail = personaDetails[personaId]
              if (!detail) return null

              return (
                <div
                  key={personaId}
                  className="flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border/50"
                >
                  <div
                    className={`h-8 w-8 rounded-full bg-gradient-to-br ${detail.color} flex items-center justify-center text-sm flex-shrink-0`}
                  >
                    {detail.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground">{detail.name}</div>
                    {detail.title && <div className="text-sm text-muted-foreground">{detail.title}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Conversation</h3>
          <ConversationControls messageCount={messages.length} mode={turnMode} onReset={handleReset} />
        </div>
      </div>
    </div>
  )
}
