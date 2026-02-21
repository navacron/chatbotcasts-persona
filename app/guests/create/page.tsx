'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Header from '@/components/header'
import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function CreateGuestPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [slug, setSlug] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [published, setPublished] = useState(false)

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')) {
      setSlug(value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-'))
    }
  }

  const handlePublish = async () => {
    if (!name.trim() || !prompt.trim()) {
      setError('Name and personality are required')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/createGuest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          prompt: prompt.trim(),
          document_link: null,
          slug: slug.trim(),
          is_public: isPublic,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create agent')
        setIsSubmitting(false)
        return
      }

      setPublished(true)
    } catch (err) {
      console.error('[v0] Error creating guest:', err)
      setError('Failed to create agent. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (published) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center space-y-4">
            <div className="text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-green-900">Agent Published!</h2>
            <p className="text-green-700">
              Your AI persona is now available for others to use in conversations.
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <Button variant="outline" onClick={() => router.push('/guests')}>
                View My Agents
              </Button>
              <Button onClick={() => window.location.reload()}>
                Create Another
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <Link href="/guests" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Agents
        </Link>

        <div className="bg-white border border-border rounded-xl p-8 space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Create AI Agent Persona</h1>
            <p className="text-muted-foreground">
              Define a custom AI persona that others can use in their conversations
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Persona Name *</label>
              <Input
                placeholder="e.g., Dr. Future Tech"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">URL Slug</label>
              <Input
                placeholder="e.g., dr-future-tech"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs. Auto-generated from name if left empty.
              </p>
            </div>

            {/* Personality - renamed from personality to prompt */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Personality & Context *
              </label>
              <textarea
                placeholder="Describe their background, expertise, perspective, and communication style..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full min-h-32 p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Visibility</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Public - Anyone can use this persona</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Private - Only you can use this persona</span>
                </label>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Link href="/guests" className="flex-1">
                <Button variant="outline" className="w-full" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
              <Button
                onClick={handlePublish}
                disabled={!name.trim() || !prompt.trim() || isSubmitting}
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? 'Publishing...' : 'Publish Agent'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
