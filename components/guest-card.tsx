import { Button } from "@/components/ui/button"
import Link from "next/link"

interface GuestCardProps {
  guest: {
    id: string
    name: string
    title: string
    author: string
    slug?: string
  }
}

export default function GuestCard({ guest }: GuestCardProps) {
  return (
    <div className="bg-white border border-border rounded-lg p-6 hover:shadow-lg transition-shadow space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-lg text-foreground">{guest.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-4">{guest.title}</p>
      </div>

      <p className="text-xs text-muted-foreground">Created by {guest.author}</p>

      <div className="pt-2">
        <Link href={`/guest/${guest.slug}`}>
          <Button size="sm" variant="outline" className="w-full bg-transparent">
            View
          </Button>
        </Link>
      </div>
    </div>
  )
}
