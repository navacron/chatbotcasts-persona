import { notFound } from "next/navigation"
import type { Metadata } from "next"
import ConversationDisplay from "@/components/conversation-display"
import { getConversationBySlug } from "@/lib/conversations"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { buildFaqJsonLd } from "@/lib/verdict-jsonld"
import type { Verdicts } from "@/lib/verdict-schemas"

// Enable Incremental Static Regeneration - cache for 1 hour
export const revalidate = 3600

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
  // Prefer the verdict bottom_line (a crisp, answer-style snippet) when present.
  const verdicts = (conversation as { data?: { verdicts?: Verdicts } }).data?.verdicts
  const bottomLine =
    typeof verdicts?.rollup?.bottom_line === "string" ? verdicts.rollup.bottom_line : ""
  const description =
    (bottomLine || conversation.description?.replace(/<[^>]*>/g, "") || "An AI-powered conversation").substring(0, 160)
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.chatbotcasts.com"
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

  const verdicts = (data.conversation as { data?: { verdicts?: Verdicts } }).data?.verdicts
  const faqJsonLd = buildFaqJsonLd(verdicts)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <Header />
      <div className="flex-1">
        <ConversationDisplay
          conversation={data.conversation}
          personas={data.personas}
          user={data.user}
          category={data.category}
          parentConversation={data.parentConversation ?? null}
          firstChildConversation={data.firstChildConversation ?? null}
        />
      </div>
      <Footer />
    </div>
  )
}
