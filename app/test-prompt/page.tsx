import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Header from "@/components/header"
import TestPromptClient from "@/components/test-prompt-client"

export default async function TestPromptPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/test-prompt")
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <TestPromptClient />
    </div>
  )
}
