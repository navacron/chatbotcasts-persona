'use client'

import { Suspense } from 'react'
import Header from '@/components/header'
import CreatePageClient from '@/components/create-page-client'

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
