import { Suspense } from "react"
import SearchResults from "@/components/search-results"
import Header from "@/components/header"
import Footer from "@/components/footer"

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <Suspense fallback={<SearchLoadingFallback />}>
        <SearchResults />
      </Suspense>
      <Footer />
    </div>
  )
}

function SearchLoadingFallback() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex-1">
      <div className="text-center py-12">
        <p className="text-muted-foreground">Loading search results...</p>
      </div>
    </div>
  )
}
