import Header from "@/components/header"
import TestPromptClient from "@/components/test-prompt-client"

export default async function TestPromptPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <TestPromptClient />
    </div>
  )
}
