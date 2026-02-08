"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useUser, SignUpButton } from "@clerk/nextjs"
import ConversationSetup from "@/components/conversation-setup"
import ChatConversation from "@/components/chat-conversation"
import PublishConversation from "@/components/publish-conversation"
import { ArrowLeft, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { canGuestCreatePost, getGuestPostsRemaining, incrementGuestPostCount } from "@/lib/guest-posts"

export default function CreatePageClient() {
  const [state, setState] = useState<"setup" | "chatting" | "publish">("setup")
  const [conversationData, setConversationData] = useState<any>(null)
  const [chatData, setChatData] = useState<any>(null)
  const [parentConversationId, setParentConversationId] = useState<string | null>(null)
  const [parentSlug, setParentSlug] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [creditsInfo, setCreditsInfo] = useState<{
    availableCredits: number
    isSubscribed: boolean
  } | null>(null)
  const [isCheckingCredits, setIsCheckingCredits] = useState(true)
  const searchParams = useSearchParams()
  const { user, isLoaded: isUserLoaded } = useUser()

  // Fetch credits for logged-in users
  useEffect(() => {
    if (isUserLoaded) {
      if (user) {
        // User is logged in - fetch credits
        console.log("[create-page] Fetching credits for logged-in user:", user.id)
        setIsCheckingCredits(true)
        fetch("/api/credits")
          .then((res) => {
            console.log("[create-page] Credits API status:", res.status)
            return res.json()
          })
          .then((data) => {
            console.log("[create-page] Credits API response:", data)
            if (data.error) {
              console.error("[create-page] Error in credits response:", data.error)
              setCreditsInfo({ availableCredits: 0, isSubscribed: false })
            } else {
              const credits = data.availableCredits ?? 0
              console.log("[create-page] Setting credits:", credits, "isSubscribed:", data.isSubscribed)
              setCreditsInfo({
                availableCredits: credits,
                isSubscribed: data.isSubscribed || false,
              })
              // Log if credits are 0
              if (credits <= 0) {
                console.warn("[create-page] WARNING: User has 0 credits, should be blocked")
              }
            }
            setIsCheckingCredits(false)
          })
          .catch((error) => {
            console.error("[create-page] Failed to fetch credits:", error)
            setCreditsInfo({ availableCredits: 0, isSubscribed: false })
            setIsCheckingCredits(false)
          })
      } else {
        // User is not logged in
        setIsCheckingCredits(false)
      }
    }
  }, [isUserLoaded, user])

  useEffect(() => {
    const conversationId = searchParams.get("conversationId")
    if (conversationId) {
      setIsLoading(true)
      fetch(`/api/conversations/by-id/${conversationId}`)
        .then((res) => res.json())
        .then((data) => {
          console.log("[v0] Loaded conversation for extension:", data)

          if (data.error) {
            console.error("[v0] Error loading conversation:", data.error)
            return
          }

          const messagesFromData = data.conversation.data?.messages || []
          const convertedMessages = messagesFromData.map((msg: any) => ({
            id: msg.id,
            persona: msg.personaId,
            name: msg.role, // role contains the persona name
            message: msg.content,
            citations: msg.citations || [],
            timestamp: msg.timestamp,
          }))

          const conversationData = {
            topic: data.conversation.data?.title || data.conversation.title,
            personas: data.conversation.data?.allPersonaIds || data.personas.map((p: any) => p.id),
            messages: convertedMessages,
            turnMode: "manual",
            numTurns: 3,
          }

          console.log("[v0] Converted conversation data:", conversationData)
          setConversationData(conversationData)
          setParentConversationId(conversationId)
          setParentSlug(data.conversation?.slug ?? null)
          setState("chatting")
        })
        .catch((error) => {
          console.error("[v0] Failed to load conversation:", error)
        })
        .finally(() => {
          setIsLoading(false)
        })
    }
  }, [searchParams])

  const handleStartConversation = (data: any) => {
    // Final credit check before starting conversation
    if (user && creditsInfo !== null && creditsInfo.availableCredits <= 0) {
      console.error("[create-page] BLOCKED: Attempted to start conversation with 0 credits")
      alert("You don't have enough credits to create a conversation. Please subscribe to get more credits.")
      return
    }
    
    // Track guest post for non-logged-in users
    if (!user) {
      incrementGuestPostCount()
    }
    setConversationData(data)
    setState("chatting")
  }

  const handlePublish = (publishData: any) => {
    setChatData(publishData)
    setState("publish")
  }

  const handleBack = () => {
    if (state === "publish") {
      setState("chatting")
    } else {
      setState("setup")
      setConversationData(null)
    }
  }

  // Show loading while checking credits
  if (isCheckingCredits || (isUserLoaded && user && creditsInfo === null)) {
    console.log("[create-page] Still loading credits:", { isCheckingCredits, isUserLoaded, user: !!user, creditsInfo })
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Check access permissions
  const isLoggedIn = isUserLoaded && !!user
  const hasCredits = creditsInfo !== null && creditsInfo.availableCredits > 0
  const canGuestPost = !isLoggedIn && canGuestCreatePost()
  const guestPostsRemaining = !isLoggedIn ? getGuestPostsRemaining() : 0

  console.log("[create-page] Access check:", {
    isLoggedIn,
    isUserLoaded,
    user: !!user,
    creditsInfo,
    hasCredits,
    availableCredits: creditsInfo?.availableCredits,
    state,
  })

  // Block logged-in users with 0 credits - ALWAYS block if no credits
  // Only allow continuing existing conversations (chatting/publish with conversationData)
  if (isLoggedIn && creditsInfo !== null && !hasCredits) {
    // Allow continuing existing conversations, but block new ones
    const canContinueExisting = (state === "chatting" || state === "publish") && conversationData
    if (!canContinueExisting) {
      console.log("[create-page] BLOCKING: User has 0 credits, showing subscription prompt")
      return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-white">
        <div className="w-full max-w-2xl space-y-8 text-center">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">No Credits Remaining</h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              {creditsInfo.isSubscribed
                ? "You've used all your credits this month. Your credits will reset at the start of next month."
                : "You've used all your free credits this month. Subscribe to get 1000 credits per month and create unlimited conversations."}
            </p>
          </div>

          <div className="bg-white border border-border rounded-xl p-8 space-y-6">
            {creditsInfo.isSubscribed ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  As a subscribed user, you'll receive 1000 credits at the start of each month.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button asChild variant="outline" size="lg">
                    <Link href="/dashboard">Go to Dashboard</Link>
                  </Button>
                  <Button asChild size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                    <Link href="/billing">Manage Subscription</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Free Plan</p>
                  <p className="text-xs text-muted-foreground">10 credits per month</p>
                </div>
                <div className="border-t border-border pt-4 space-y-2">
                  <p className="text-sm font-semibold text-foreground">Subscribe for More</p>
                  <p className="text-xs text-muted-foreground">Get 1000 credits per month</p>
                </div>
                <Button asChild size="lg" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  <Link href="/billing">View Subscription Plans</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
    }
  }

  // Block non-logged-in users who have used their 5 free posts (only in setup state)
  if (!isLoggedIn && !canGuestPost && state === "setup") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-white">
        <div className="w-full max-w-2xl space-y-8 text-center">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <CreditCard className="h-8 w-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Sign Up to Continue</h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              You've used all 5 free posts. Sign up to get 10 free credits per month and create unlimited conversations!
            </p>
          </div>

          <div className="bg-white border border-border rounded-xl p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Free Account Benefits</p>
                <ul className="text-xs text-muted-foreground text-left space-y-1 max-w-md mx-auto">
                  <li>• 10 free credits per month</li>
                  <li>• Save and publish your conversations</li>
                  <li>• Access to your conversation history</li>
                  <li>• Create custom personas</li>
                </ul>
              </div>
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-sm font-semibold text-foreground">Subscribe for More</p>
                <p className="text-xs text-muted-foreground">Get 1000 credits per month</p>
              </div>
              <div className="flex flex-col gap-3">
                <Button asChild size="lg" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90">
                  <Link href="/sign-up">Sign Up Free</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading conversation...</p>
          </div>
        </div>
      </div>
    )
  }

  // Final safety check: Don't render ConversationSetup if logged-in user has 0 credits
  if (state === "setup" && isLoggedIn && creditsInfo !== null && creditsInfo.availableCredits <= 0) {
    console.error("[create-page] SAFETY CHECK: Blocking ConversationSetup render - user has 0 credits")
    // This should have been caught above, but just in case
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No credits available. Please subscribe to create conversations.</p>
          <Button asChild>
            <Link href="/billing">View Subscription Plans</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {state === "setup" ? (
        <>
          {!isLoggedIn && (
            <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 pb-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-900">
                  <strong>Guest Mode:</strong> You have {guestPostsRemaining} free {guestPostsRemaining === 1 ? "post" : "posts"} remaining this month.{" "}
                  <SignUpButton mode="modal" fallbackRedirectUrl="/create">
                    <button className="underline font-semibold text-blue-900 hover:text-blue-700">
                      Sign up
                    </button>
                  </SignUpButton>{" "}
                  to get 10 free credits per month!
                </p>
              </div>
            </div>
          )}
          <ConversationSetup onStart={handleStartConversation} />
        </>
      ) : state === "chatting" && conversationData ? (
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Setup
          </button>
          <ChatConversation data={conversationData} onPublish={handlePublish} />
        </div>
      ) : state === "publish" && conversationData && chatData ? (
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Conversation
          </button>
          <PublishConversation
            conversationData={conversationData}
            chatData={chatData}
            parentConversationId={parentConversationId}
            parentSlug={parentSlug}
          />
        </div>
      ) : null}
    </>
  )
}
