import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Terms of Service | ChatBotCasts",
  description: "Read the ChatBotCasts terms of service governing your use of the platform.",
  alternates: {
    canonical: "https://www.chatbotcasts.com/terms",
  },
}

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return children
}
