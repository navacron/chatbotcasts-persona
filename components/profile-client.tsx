'use client'

import { useState } from 'react'
import { User, Mail, Calendar, LogOut, Save, Eye, EyeOff } from 'lucide-react'
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

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSave = async () => {
    setLoading(true)
    setError('')

    try {
      // Update user metadata
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        {/* Header */}
        <div className="space-y-2 mb-12">
          <h1 className="text-4xl font-bold text-foreground">Account Settings</h1>
          <p className="text-muted-foreground">Manage your profile and account preferences</p>
        </div>

        {/* Success Message */}
        {saved && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
            Profile updated successfully!
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white border border-border rounded-xl space-y-8">
          {/* Avatar Section */}
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

          {/* Profile Info */}
          <div className="p-8 space-y-6">
            {/* Name */}
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

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </label>
              <p className="text-foreground">{userData.email}</p>
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            {/* Bio */}
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

            {/* Join Date */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Member Since
              </label>
              <p className="text-foreground">{userData.joinDate}</p>
            </div>

            {/* Password */}
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

            {/* Action Buttons */}
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

          {/* Danger Zone */}
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

        {/* Related Links */}
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
