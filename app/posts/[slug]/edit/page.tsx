import { notFound } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import Header from "@/components/header"
import Footer from "@/components/footer"
import { getConversationBySlug } from "@/lib/conversations"
import { createClient } from "@/lib/supabase/server"
import EditPostClient from "@/components/edit-post-client"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function EditPostPage({ params }: PageProps) {
  const { slug } = await params
  const { userId } = await auth()
  if (!userId) {
    notFound()
  }

  const data = await getConversationBySlug(slug, { skipViewIncrement: true })
  if (!data) notFound()

  const conversation = data.conversation as { user_id?: string }
  if (conversation.user_id !== userId) {
    notFound()
  }

  const supabase = await createClient()
  const { data: categories } = await supabase
    .from("category")
    .select("id, name, slug, description")
    .order("name", { ascending: true })

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <div className="flex-1 w-full">
        <EditPostClient
          conversation={data.conversation}
          linkedPersonaIds={data.linkedPersonaIds ?? []}
          categories={categories ?? []}
        />
      </div>
      <Footer />
    </div>
  )
}
