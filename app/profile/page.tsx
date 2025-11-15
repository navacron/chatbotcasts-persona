import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProfileClient from '@/components/profile-client'

export default async function ProfilePage() {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userData = {
    id: user.id,
    name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    joinDate: new Date(user.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    bio: user.user_metadata?.bio || '',
  }

  return <ProfileClient userData={userData} />
}
