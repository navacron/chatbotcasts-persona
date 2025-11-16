'use client'

import { useState, useEffect } from 'react'
import { User, Mail, Calendar, LogOut, Save, Eye, EyeOff, Zap, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Header from '@/components/header'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface UserData {
  id: string
  name: string
  email: string
  joinDate: string
  bio: string
  credits: number
  subscriptionPlan: string
  subscriptionStatus: string
}

export default function ProfileClient({ userData }: { userData: UserData }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(userData)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [billingHistory, setBillingHistory] = useState<any[]>([])
  const [showBillingHistory, setShowBillingHistory] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    async function fetchBillingHistory() {
      try {
        const response = await fetch('/api/user/billing-history')
        const data = await response.json()
        setBillingHistory(data.history || [])
      } catch (error) {
        console.error('[v0] Error fetching billing history:', error)
      }
    }
    
    if (showBillingHistory) {
      fetchBillingHistory()
    }
  }, [showBillingHistory])

  const handleSave = async () => {
    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          display_name: formData.name,
          bio: formData.bio,
        },
      })

      if (updateError) throw updateError

      setSaved(true)
      setIsEditing(false)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const handleChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const formatPlanName = (plan: string) => {
    if (plan === 'free') return 'Free'
    if (plan === 'monthly') return 'Monthly Pro'
    if (plan === 'yearly') return 'Yearly Pro'
    return plan
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <div className="space-y-2 mb-12">
          <h1 className="text-4xl font-bold text-foreground">Account Settings</h1>
          <p className="text-muted-foreground">Manage your profile and account preferences</p>
        </div>

        {saved && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
            Profile updated successfully!
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Subscription & Credits
            </h3>
            <Link href="/billing">
              <Button size="sm" variant="outline">
                Manage Plan
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Available Credits</p>
              <p className="text-2xl font-bold text-foreground">{userData.credits}</p>
            </div>
            <div className="bg-white/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
              <p className="text-lg font-semibold text-foreground">{formatPlanName(userData.subscriptionPlan)}</p>
            </div>
          </div>
          
          {userData.credits < 50 && (
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-700">
                You're running low on credits. <Link href="/billing" className="underline font-medium">Upgrade your plan</Link> to continue creating conversations.
              </p>
            </div>
          )}
        </div>

        <div className="bg-white border border-border rounded-xl space-y-8">
          <div className="border-b border-border p-8">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-4xl">
                👤
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-1">{userData.name}</h2>
                <p className="text-muted-foreground">{userData.email}</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name
              </label>
              {isEditing ? (
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="h-11"
                />
              ) : (
                <p className="text-foreground">{userData.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </label>
              <p className="text-foreground">{userData.email}</p>
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Bio</label>
              {isEditing ? (
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Tell us about yourself"
                  className="w-full min-h-24 p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              ) : (
                <p className="text-foreground">{userData.bio || 'No bio added yet'}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Member Since
              </label>
              <p className="text-foreground">{userData.joinDate}</p>
            </div>

            {isEditing && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">New Password (optional)</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="h-11 pr-10"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-6 border-t border-border">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false)
                      setFormData(userData)
                      setPassword('')
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-gradient-to-r from-primary to-accent hover:opacity-90"
                    disabled={loading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </div>

          <div className="border-t border-border p-8 space-y-4 bg-red-50/50">
            <h3 className="font-semibold text-foreground">Danger Zone</h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full border-red-200 hover:bg-red-50"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
              <p className="text-xs text-muted-foreground">
                Deleting your account is permanent and cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white border border-border rounded-xl">
          <button
            onClick={() => setShowBillingHistory(!showBillingHistory)}
            className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Billing History</h3>
            </div>
            <span className="text-muted-foreground">
              {showBillingHistory ? '▼' : '▶'}
            </span>
          </button>
          
          {showBillingHistory && (
            <div className="border-t border-border p-6 space-y-4">
              {billingHistory.length > 0 ? (
                billingHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-foreground">{item.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        ${item.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-green-600">
                        +{item.credits_added} credits
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No billing history yet
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-4">
          <h3 className="font-semibold text-blue-900">Other Resources</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/billing">
              <Button variant="ghost" className="w-full justify-start text-blue-600 hover:bg-blue-100">
                Billing & Credits
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" className="w-full justify-start text-blue-600 hover:bg-blue-100">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
