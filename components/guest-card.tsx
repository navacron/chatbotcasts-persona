import { Star, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface GuestCardProps {
  guest: {
    id: string
    name: string
    title: string
    author: string
    uses: number
    rating: number
    slug?: string // Added slug field for linking
  }
}

export default function GuestCard({ guest }: GuestCardProps) {
  return (
    <div className="bg-white border border-border rounded-lg p-6 hover:shadow-lg transition-shadow space-y-4">
      <div className="space-y-2">
        <h3 className="font-semibold text-lg text-foreground">{guest.name}</h3>
        <p className="text-sm text-muted-foreground">{guest.title}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-accent text-accent" />
          <span>{guest.rating}</span>
        </div>
        <span className="text-xs">{guest.uses} uses</span>
      </div>

      <p className="text-xs text-muted-foreground">Created by {guest.author}</p>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" className="flex-1 bg-transparent">
          <Copy className="h-4 w-4 mr-2" />
          Use
        </Button>
        <Link href={`/guest/${guest.slug}`}>
          <Button size="sm" variant="outline" className="flex-1 bg-transparent">
            View
          </Button>
        </Link>
      </div>
    </div>
  )
}
