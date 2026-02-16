"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import ChatConversation from "@/components/chat-conversation"
import PublishConversation from "@/components/publish-conversation"
import RevisionHistory from "@/components/revision-history"

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
}

interface ConversationForEdit {
  id: string
  slug?: string
  title: string
  description?: string
  topic?: string
  updated_at?: string
  data: { messages?: Array<{ id?: number; personaId?: string; role?: string; content?: string; citations?: string[]; timestamp?: string }>; title?: string; allPersonaIds?: string[] }
  is_public?: boolean
  category_id?: string
  feature_image?: string | null
}

interface EditPostClientProps {
  conversation: ConversationForEdit
  linkedPersonaIds: string[]
  categories: Category[]
}

function buildConversationData(conversation: ConversationForEdit, linkedPersonaIds: string[]) {
  const messagesFromData = conversation.data?.messages || []
  const convertedMessages = messagesFromData.map((msg: any, index: number) => ({
    id: msg.id ?? index + 1,
    persona: msg.personaId,
    name: msg.role,
    message: msg.content ?? "",
    citations: msg.citations || [],
    timestamp: msg.timestamp,
  }))
  return {
    topic: conversation.data?.title || conversation.title,
    personas: conversation.data?.allPersonaIds || linkedPersonaIds,
    messages: convertedMessages,
    turnMode: "manual" as const,
    numTurns: 3,
    // Include plan data if it exists in the saved conversation
    ...(conversation.data?.plan && {
      plan: conversation.data.plan
    }),
  }
}

export default function EditPostClient({
  conversation,
  linkedPersonaIds,
  categories,
}: EditPostClientProps) {
  const router = useRouter()
  const [state, setState] = useState<"chatting" | "save">("chatting")
  const [chatData, setChatData] = useState<any>(null)
  const [restoredConversation, setRestoredConversation] = useState<ConversationForEdit | null>(null)

  const effectiveConversation = restoredConversation ?? conversation
  const conversationData = useMemo(
    () => buildConversationData(effectiveConversation, linkedPersonaIds),
    [effectiveConversation, linkedPersonaIds]
  )

  if (state === "chatting") {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <Button
          variant="ghost"
          className="mb-6 text-muted-foreground hover:text-foreground"
          onClick={() => router.push(`/posts/${conversation.slug ?? ""}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to post
        </Button>
        <RevisionHistory
          conversationId={conversation.id}
          onRestored={(updated) => setRestoredConversation(updated as ConversationForEdit)}
          className="mb-6"
        />
        <div className="space-y-2 mb-4">
          <h1 className="text-2xl font-bold">Edit this post</h1>
          <p className="text-muted-foreground">
            Add more discussion or edit the conversation below. When done, click Publish to go to the save step (same URL, previous version saved to history).
          </p>
        </div>
        <ChatConversation
          key={`chat-${effectiveConversation.id}-${effectiveConversation.updated_at ?? ""}`}
          data={conversationData}
          onPublish={(data) => {
            setChatData(data)
            setState("save")
          }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
      <Button
        variant="ghost"
        className="mb-6 text-muted-foreground hover:text-foreground"
        onClick={() => setState("chatting")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to conversation
      </Button>
      <RevisionHistory
        conversationId={conversation.id}
        onRestored={(updated) => setRestoredConversation(updated as ConversationForEdit)}
        className="mb-6"
      />
      <PublishConversation
        conversationData={conversationData}
        chatData={chatData}
        editMode
        conversationId={effectiveConversation.id}
        existingSlug={effectiveConversation.slug}
        existingDescription={effectiveConversation.description ?? ""}
        existingCategoryId={effectiveConversation.category_id ?? ""}
        existingIsPublic={effectiveConversation.is_public ?? true}
        existingFeatureImage={effectiveConversation.feature_image ?? null}
        categories={categories}
      />
    </div>
  )
}
