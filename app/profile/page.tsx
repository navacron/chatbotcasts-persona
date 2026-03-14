import type { Metadata } from "next"
import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import ProfileClient from "@/components/profile-client"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = {
  title: "My Profile | ChatBotCasts",
  description: "Manage your ChatBotCasts profile and conversations.",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const { userId } = await auth()
  const user = await currentUser()

  if (!userId || !user) {
    redirect("/")
  }

  const supabase = await createClient()

  const { data: userData } = await supabase
    .from("users")
    .select("credits, subscription_plan, subscription_status")
    .eq("id", userId)
    .single()

  const profileData = {
    id: userId,
    name: user.firstName || user.username || user.emailAddresses[0]?.emailAddress.split("@")[0] || "User",
    email: user.emailAddresses[0]?.emailAddress || "",
    joinDate: new Date(user.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    bio: (user.publicMetadata?.bio as string) || "",
    credits: userData?.credits || 0,
    subscriptionPlan: userData?.subscription_plan || "free",
    subscriptionStatus: userData?.subscription_status || "active",
  }

  return <ProfileClient userData={profileData} />
}
