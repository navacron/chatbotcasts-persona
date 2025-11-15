import { Star, Eye, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConversationCardProps {
  conversation: {
    id: number
    title: string
    description: string
    participants: string[]
    views: number
    rating: number
    author: string
  }
}

export default function ConversationCard({ conversation }: ConversationCardProps) {
  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Card Content */}
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg text-foreground line-clamp-2">
            {conversation.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {conversation.description}
          </p>
        </div>

        {/* Participants */}
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

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{conversation.views.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span>{conversation.rating}</span>
            </div>
          </div>
          <span className="text-xs">by {conversation.author}</span>
        </div>

        {/* Action Button */}
        <Button size="sm" className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90">
          Play Conversation
        </Button>
      </div>
    </div>
  )
}
