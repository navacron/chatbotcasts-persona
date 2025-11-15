'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import ConversationSetup from '@/components/conversation-setup'
import ChatConversation from '@/components/chat-conversation'
import PublishConversation from '@/components/publish-conversation'
import { ArrowLeft } from 'lucide-react'

export default function CreatePageClient() {
  const [state, setState] = useState<'setup' | 'chatting' | 'publish'>('setup')
  const [conversationData, setConversationData] = useState<any>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    const conversationParam = searchParams.get('conversation')
    if (conversationParam) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(conversationParam))
        setConversationData(decodedData)
        setState('chatting')
      } catch (error) {
        console.error('[v0] Failed to load conversation:', error)
      }
    }
  }, [searchParams])

  const handleStartConversation = (data: any) => {
    setConversationData(data)
    setState('chatting')
  }

  const handlePublish = () => {
    setState('publish')
  }

  const handleBack = () => {
    if (state === 'publish') {
      setState('chatting')
    } else {
      setState('setup')
      setConversationData(null)
    }
  }

  return (
    <>
      {state === 'setup' ? (
        <ConversationSetup onStart={handleStartConversation} />
      ) : state === 'chatting' && conversationData ? (
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
      ) : state === 'publish' && conversationData ? (
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Conversation
          </button>
          <PublishConversation conversationData={conversationData} />
        </div>
      ) : null}
    </>
  )
}
