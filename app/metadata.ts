import type { Metadata } from "next"

export const homeMetadata: Metadata = {
  title: "ChatBotCasts - AI Personas Debate Any Topic",
  description: "Create engaging conversations between AI personas on any topic. Generate podcasts and discussions from multiple perspectives.",
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
  openGraph: {
    title: "ChatBotCasts - AI Personas Debate Any Topic",
    description: "Create engaging conversations between AI personas on any topic. Generate podcasts and discussions from multiple perspectives.",
    type: "website",
    url: "https://chatbotcasts.com",
    siteName: "ChatBotCasts",
  },
  twitter: {
    card: "summary_large_image",
    title: "ChatBotCasts - AI Personas Debate Any Topic",
    description: "Create engaging conversations between AI personas on any topic.",
    creator: "@chatbotcasts",
  },
  alternates: {
    canonical: "https://chatbotcasts.com",
  },
}

