import Header from "@/components/header"
import Footer from "@/components/footer"
import HomeClient from "@/components/home-client"
import { getConversationsServerCached, getCategoriesServerCached } from "@/lib/api-client"

// Enable Incremental Static Regeneration - cache for 1 hour
export const revalidate = 3600

export default async function Home() {
  // Fetch data server-side with caching for optimal performance
  const [categories, conversations] = await Promise.all([
    getCategoriesServerCached(),
    getConversationsServerCached(),
  ])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <HomeClient initialCategories={categories} initialConversations={conversations} />
      <Footer />
    </div>
  )
}
