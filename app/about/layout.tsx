import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "About ChatBotCasts | AI-Powered Conversations",
  description: "Learn how ChatBotCasts revolutionizes conversations through AI-powered persona interactions. Explore expert debates from multiple perspectives on any topic.",
  alternates: {
    canonical: "https://www.chatbotcasts.com/about",
  },
}

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children
}
