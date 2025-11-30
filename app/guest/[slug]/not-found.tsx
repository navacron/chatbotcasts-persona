import Link from "next/link"
import { Button } from "@/components/ui/button"
import Header from "@/components/header"

export default function GuestNotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-4xl font-bold mb-4">Guest Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The guest you're looking for doesn't exist or is not publicly available.
        </p>
        <Link href="/guests">
          <Button>Browse All Guests</Button>
        </Link>
      </div>
    </div>
  )
}
