import type { Metadata } from "next"
import Header from "@/components/header"
import Footer from "@/components/footer"
import HomeClient from "@/components/home-client"
import { getConversationsServerCached, getCategoriesServerCached } from "@/lib/api-client"

export const metadata: Metadata = {
  title: "ChatBotCasts - AI Personas Debate Any Topic",
  description: "Create engaging conversations between AI personas on any topic. Generate podcasts and discussions from multiple perspectives.",
  openGraph: {
    title: "ChatBotCasts - AI Personas Debate Any Topic",
    description: "Create engaging conversations between AI personas on any topic. Generate podcasts and discussions from multiple perspectives.",
    type: "website",
    url: "https://www.chatbotcasts.com",
    siteName: "ChatBotCasts",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatBotCasts - AI Personas Debate Any Topic",
    description: "Create engaging conversations between AI personas on any topic. Generate podcasts and discussions from multiple perspectives.",
    creator: "@ChatBotCasts",
  },
  alternates: {
    canonical: "https://www.chatbotcasts.com",
  },
}

// Enable Incremental Static Regeneration - cache for 1 hour
export const revalidate = 3600

export default async function Home() {
  // Fetch data server-side with caching for optimal performance
  const [categories, conversations] = await Promise.all([
    getCategoriesServerCached(),
    getConversationsServerCached(),
  ])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <HomeClient initialCategories={categories} initialConversations={conversations} />
      <Footer />
    </div>
  )
}
