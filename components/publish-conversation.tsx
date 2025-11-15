'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface PublishConversationProps {
  conversationData: any
}

export default function PublishConversation({ conversationData }: PublishConversationProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [published, setPublished] = useState(false)

  const handlePublish = () => {
    if (!isSignedIn) {
      setShowSignIn(true)
      return
    }

    if (title.trim()) {
      setPublished(true)
    }
  }

  if (published) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
        <h2 className="text-2xl font-bold text-green-900">Conversation Published!</h2>
        <p className="text-green-700">
          Your conversation has been shared with the community. You can view it on the home page.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Button variant="outline">View Conversation</Button>
          <Button>Create Another</Button>
        </div>
      </div>
    )
  }

  if (showSignIn) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 space-y-6">
        <div className="flex gap-3">
          <AlertCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Sign up to publish</h3>
            <p className="text-blue-700 mb-4">
              You need to create an account to publish conversations. It only takes a minute!
            </p>
            <div className="space-y-3">
              <Input
                placeholder="Email address"
                type="email"
                className="bg-white"
              />
              <Input
                placeholder="Password"
                type="password"
                className="bg-white"
              />
              <Input
                placeholder="Confirm password"
                type="password"
                className="bg-white"
              />
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowSignIn(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  onClick={() => {
                    setIsSignedIn(true)
                    setShowSignIn(false)
                  }}
                >
                  Create Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-border rounded-lg p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Publish Your Conversation</h1>
        <p className="text-muted-foreground">
          Share your AI conversation with the community and earn credits
        </p>
      </div>

      <div className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">
            Conversation Title
          </label>
          <Input
            placeholder="e.g., AI Ethics: Three Perspectives"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground">
            Description
          </label>
          <textarea
            placeholder="Describe what this conversation is about..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full min-h-24 p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Privacy */}
        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground">
            Privacy
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={isPublic}
                onChange={() => setIsPublic(true)}
                className="w-4 h-4"
              />
              <span className="text-foreground">Public (anyone can find and use)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                className="w-4 h-4"
              />
              <span className="text-foreground">Private (only with link)</span>
            </label>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Earn Credits:</strong> When your conversation is published, you earn credits for each view and interaction. Use these to create more conversations!
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <Button variant="outline">
            Save as Draft
          </Button>
          <Button
            onClick={handlePublish}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            Publish Conversation
          </Button>
        </div>
      </div>
    </div>
  )
}
