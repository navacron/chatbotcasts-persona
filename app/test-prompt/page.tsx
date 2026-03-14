import type { Metadata } from "next"
import Header from "@/components/header"
import PasswordProtectedTestPrompt from "@/components/password-protected-test-prompt"

export const metadata: Metadata = {
  title: "Test Prompt | ChatBotCasts",
  description: "Internal test page for ChatBotCasts.",
  robots: { index: false, follow: false },
}

export default async function TestPromptPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PasswordProtectedTestPrompt />
    </div>
  )
}
