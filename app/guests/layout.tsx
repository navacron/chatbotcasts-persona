import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "AI Personas & Agents | ChatBotCasts",
  description: "Browse all AI personas and agents on ChatBotCasts. Each persona brings unique expertise and perspectives to AI-powered conversations.",
  alternates: {
    canonical: "https://www.chatbotcasts.com/guests",
  },
}

export default function GuestsLayout({ children }: { children: React.ReactNode }) {
  return children
}
