import Link from "next/link"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"
import Footer from "@/components/footer"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-foreground">Category Not Found</h1>
          <p className="text-lg text-muted-foreground">The category you're looking for doesn't exist.</p>
          <Link href="/">
            <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90">Back to Home</Button>
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}
