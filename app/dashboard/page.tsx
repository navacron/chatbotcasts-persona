"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { Zap, Clock, Share2, Users, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { createBrowserClient } from "@/lib/supabase/client"

const USER_DATA = {
  name: "Alex Johnson",
  email: "alex@example.com",
  credits: 25,
  totalCreditsUsed: 150,
  joinDate: "Jan 15, 2025",
  avatar: "👤",
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"conversations" | "guests">("conversations")
  const [myConversations, setMyConversations] = useState<any[]>([])
  const [myGuests, setMyGuests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userCredits, setUserCredits] = useState<number>(0)
  const router = useRouter()
  const supabase = createBrowserClient()
  const { user, isLoaded } = useUser()

  useEffect(() => {
    async function fetchData() {
      if (!isLoaded) return

      if (!user) {
        router.push("/")
        return
      }

      try {
        const { data: userData } = await supabase.from("users").select("credits").eq("id", user.id).single()

        if (userData) {
          setUserCredits(userData.credits || 0)
        }

        const conversationsRes = await fetch(`/api/conversations?userId=${user.id}`)
        const conversationsData = await conversationsRes.json()
        setMyConversations(conversationsData.conversations || [])

        const guestsRes = await fetch("/api/user/guests")
        const guestsData = await guestsRes.json()
        setMyGuests(guestsData.guests || [])
      } catch (error) {
        console.error("[v0] Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isLoaded, user])

  const stats = [
    { label: "Conversations", value: myConversations.length, icon: Share2 },
    { label: "Custom Agents", value: myGuests.length, icon: Users },
    {
      label: "Total Views",
      value: myConversations.reduce((sum, conv) => sum + (conv.views || 0), 0),
      icon: TrendingUp,
    },
    { label: "Credits Remaining", value: userCredits, icon: Zap },
  ]

  const handleOpenConversation = (slug: string) => {
    router.push(`/posts/${slug}`)
  }

  if (loading || !isLoaded) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 text-center">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="space-y-8 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-foreground">
              Welcome back, {user?.firstName || user?.username || "User"}!
            </h1>
            <p className="text-muted-foreground">Manage your conversations and agent personas</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="bg-white border border-border rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
              )
            })}
          </div>

          {userCredits < 50 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-4">
              <Zap className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">Credits Running Low</h3>
                <p className="text-sm text-blue-700 mb-3">
                  You have {userCredits} credits remaining. Purchase more to keep creating conversations.
                </p>
                <Link href="/billing">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Buy Credits
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2 border-b border-border">
              <button
                onClick={() => setActiveTab("conversations")}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "conversations"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                My Conversations
              </button>
              <button
                onClick={() => setActiveTab("guests")}
                className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === "guests"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
My Agents
            </button>
            </div>
            <Link href="/create">
              <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">New Conversation</Button>
            </Link>
          </div>

          {activeTab === "conversations" && (
            <div className="space-y-4">
              {myConversations.length > 0 ? (
                myConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleOpenConversation(conv.slug)}
                    className="bg-white border border-border rounded-lg p-6 flex items-center justify-between hover:shadow-md hover:border-primary cursor-pointer transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-foreground">{conv.title}</h3>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            conv.is_public ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {conv.is_public ? "published" : "draft"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{conv.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(conv.createdAt).toLocaleDateString()}
                        </div>
                        {conv.views > 0 && (
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            {conv.views} views
                          </div>
                        )}
                        {conv.participants && conv.participants.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {conv.participants.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenConversation(conv.slug)
                      }}
                    >
                      View
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-border">
                  <p className="text-muted-foreground mb-4">No conversations yet</p>
                  <Link href="/create">
                    <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                      Create First Conversation
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}

          {activeTab === "guests" && (
            <div className="space-y-4">
              {myGuests.length > 0 ? (
                myGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="bg-white border border-border rounded-lg p-6 flex items-center justify-between hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-foreground mb-1">{guest.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{guest.description}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Created {new Date(guest.createdAt).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {guest.uses} conversations
                        </div>
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            guest.isPublic ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {guest.isPublic ? "Public" : "Private"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/guests/${guest.slug || guest.id}`}>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-white rounded-lg border border-border">
                  <p className="text-muted-foreground mb-4">No custom agents yet</p>
                  <Link href="/guests/create">
                    <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
                      Create First Agent
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
