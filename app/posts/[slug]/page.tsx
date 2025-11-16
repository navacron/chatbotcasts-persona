import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import ConversationDisplay from '@/components/conversation-display'
import { getConversationBySlug } from '@/lib/conversations'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const data = await getConversationBySlug(resolvedParams.slug)

  if (!data) {
    return {
      title: 'Conversation Not Found',
    }
  }

  return {
    title: data.conversation.title || 'ChatBotCasts Conversation',
    description: data.conversation.description || 'An AI-powered conversation',
  }
}

export default async function PostPage({ params }: PageProps) {
  const resolvedParams = await params
  const data = await getConversationBySlug(resolvedParams.slug)

  if (!data) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white">
      <ConversationDisplay
        conversation={data.conversation}
        personas={data.personas}
        user={data.user}
      />
    </div>
  )
}
