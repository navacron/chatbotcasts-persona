import { notFound } from "next/navigation"
import type { Metadata } from "next"
import ConversationDisplay from "@/components/conversation-display"
import { getConversationBySlug } from "@/lib/conversations"
import Header from "@/components/header"
import Footer from "@/components/footer"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params
  const data = await getConversationBySlug(resolvedParams.slug)

  if (!data) {
    return {
      title: "Conversation Not Found",
    }
  }

  const conversation = data.conversation
  const description =
    conversation.description?.replace(/<[^>]*>/g, "").substring(0, 160) || "An AI-powered conversation"
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chatbotcasts.com"
  const pageUrl = `${siteUrl}/posts/${conversation.slug}`

  return {
    title: `${conversation.title} - AI Podcast`,
    description,
    keywords: [
      "podcast",
      "discussion",
      "interview",
      "chatbots",
      "AI conversations",
      "learning",
      "blogs",
      "podcasts",
      "AI Podcasts",
    ],
    authors: [{ name: "ChatBotCasts", url: siteUrl }],
    creator: "ChatBotCasts",
    publisher: "ChatBotCasts",
    openGraph: {
      title: `${conversation.title} - AI Podcast`,
      description,
      type: "article",
      url: pageUrl,
      siteName: "ChatBotCasts",
      images: [
        {
          url: conversation.feature_image || `${siteUrl}/images/default-og-image.png`,
          width: 1200,
          height: 630,
          alt: conversation.title,
        },
      ],
      publishedTime: conversation.created_at,
      modifiedTime: conversation.updated_at,
    },
    twitter: {
      card: "summary_large_image",
      title: conversation.title,
      description,
      images: [conversation.feature_image || `${siteUrl}/images/default-og-image.png`],
      creator: "@ChatBotCasts",
      site: "@ChatBotCasts",
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: pageUrl,
    },
  }
}

export default async function PostPage({ params }: PageProps) {
  const resolvedParams = await params
  const data = await getConversationBySlug(resolvedParams.slug)

  if (!data) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1">
        <ConversationDisplay
          conversation={data.conversation}
          personas={data.personas}
          user={data.user}
          category={data.category}
        />
      </div>
      <Footer />
    </div>
  )
}
