import { Eye, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

interface ConversationCardProps {
  conversation: {
    id: string
    title: string
    description: string
    slug: string
    participants: string[]
    views: number
    author: string
    featureImage?: string | null
  }
}

export default function ConversationCard({ conversation }: ConversationCardProps) {
  return (
    <Link href={`/posts/${conversation.slug}`} className="block">
      <div className="bg-white border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow h-full">
        {conversation.featureImage && (
          <div className="relative w-full h-48 bg-muted">
            <Image
              src={conversation.featureImage || "/placeholder.svg"}
              alt={conversation.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        {/* Card Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-foreground line-clamp-2">{conversation.title}</h3>
            <p className="text-sm text-muted-foreground line-clamp-2">{conversation.description}</p>
          </div>

          {/* Participants */}
          {conversation.participants.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {conversation.participants.map((p, i) => (
                  <span key={i} className="text-xs bg-secondary text-foreground px-2 py-1 rounded">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{conversation.views.toLocaleString()}</span>
              </div>
            </div>
            <span className="text-xs">by {conversation.author}</span>
          </div>

          {/* Action Button */}
          <Button size="sm" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90">
            View Conversation
          </Button>
        </div>
      </div>
    </Link>
  )
}
