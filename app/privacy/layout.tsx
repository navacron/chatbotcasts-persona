import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Privacy Policy | ChatBotCasts",
  description: "Read the ChatBotCasts privacy policy to understand how we collect, use, and protect your data.",
  alternates: {
    canonical: "https://www.chatbotcasts.com/privacy",
  },
}

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return children
}
