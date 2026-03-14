import type { Metadata } from "next"
import { Suspense } from 'react'
import Header from '@/components/header'
import CreatePageClient from '@/components/create-page-client'

export const metadata: Metadata = {
  title: "Create a Conversation | ChatBotCasts",
  description: "Create a new AI-powered conversation between multiple personas.",
  robots: { index: false, follow: false },
}

export default function CreatePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <CreatePageClient />
      </Suspense>
    </div>
  )
}
