import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Create an Agent | ChatBotCasts",
  description: "Create a custom AI persona for ChatBotCasts conversations.",
  robots: { index: false, follow: false },
}

export default function GuestsCreateLayout({ children }: { children: React.ReactNode }) {
  return children
}
