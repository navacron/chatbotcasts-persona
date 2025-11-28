"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import ConversationSetup from "@/components/conversation-setup"
import ChatConversation from "@/components/chat-conversation"
import PublishConversation from "@/components/publish-conversation"
import { ArrowLeft } from "lucide-react"

export default function CreatePageClient() {
  const [state, setState] = useState<"setup" | "chatting" | "publish">("setup")
  const [conversationData, setConversationData] = useState<any>(null)
  const [chatData, setChatData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const conversationId = searchParams.get("conversationId")
    if (conversationId) {
      setIsLoading(true)
      fetch(`/api/conversations/by-id/${conversationId}`)
        .then((res) => res.json())
        .then((data) => {
          console.log("[v0] Loaded conversation for extension:", data)

          if (data.error) {
            console.error("[v0] Error loading conversation:", data.error)
            return
          }

          const messagesFromData = data.conversation.data?.messages || []
          const convertedMessages = messagesFromData.map((msg: any) => ({
            id: msg.id,
            persona: msg.personaId,
            name: msg.role, // role contains the persona name
            message: msg.content,
            citations: msg.citations || [],
            timestamp: msg.timestamp,
          }))

          const conversationData = {
            topic: data.conversation.data?.title || data.conversation.title,
            personas: data.conversation.data?.allPersonaIds || data.personas.map((p: any) => p.id),
            messages: convertedMessages,
            turnMode: "manual",
            numTurns: 3,
          }

          console.log("[v0] Converted conversation data:", conversationData)
          setConversationData(conversationData)
          setState("chatting")
        })
        .catch((error) => {
          console.error("[v0] Failed to load conversation:", error)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [searchParams])

  const handleStartConversation = (data: any) => {
    setConversationData(data)
    setState("chatting")
  }

  const handlePublish = (publishData: any) => {
    setChatData(publishData)
    setState("publish")
  }

  const handleBack = () => {
    if (state === "publish") {
      setState("chatting")
    } else {
      setState("setup")
      setConversationData(null)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading conversation...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {state === "setup" ? (
        <ConversationSetup onStart={handleStartConversation} />
      ) : state === "chatting" && conversationData ? (
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Setup
          </button>
          <ChatConversation data={conversationData} onPublish={handlePublish} />
        </div>
      ) : state === "publish" && conversationData && chatData ? (
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Conversation
          </button>
          <PublishConversation conversationData={conversationData} chatData={chatData} />
        </div>
      ) : null}
    </>
  )
}
