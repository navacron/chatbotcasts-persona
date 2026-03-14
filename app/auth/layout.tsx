import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Sign In to ChatBotCasts | AI-Powered Conversations",
  description: "Sign in or create an account to start generating AI-powered conversations on ChatBotCasts.",
  robots: { index: false, follow: false },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
