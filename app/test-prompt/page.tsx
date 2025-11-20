import Header from "@/components/header"
import PasswordProtectedTestPrompt from "@/components/password-protected-test-prompt"

export default async function TestPromptPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PasswordProtectedTestPrompt />
    </div>
  )
}
