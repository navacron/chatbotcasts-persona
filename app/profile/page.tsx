import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from '@/components/profile-client'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('credits, subscription_plan, subscription_status')
    .eq('id', user.id)
    .single()

  const profileData = {
    id: user.id,
    name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    joinDate: new Date(user.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    bio: user.user_metadata?.bio || '',
    credits: userData?.credits || 0,
    subscriptionPlan: userData?.subscription_plan || 'free',
    subscriptionStatus: userData?.subscription_status || 'active',
  }

  return <ProfileClient userData={profileData} />
}
