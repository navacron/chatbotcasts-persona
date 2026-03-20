import { Eye, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import GradientCover from "@/components/gradient-cover"

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
    categorySlug?: string | null
    versionCount?: number
    versions?: { slug: string; version: number }[]
  }
}

export default function ConversationCard({ conversation }: ConversationCardProps) {
  const showParts =
    (conversation.versionCount && conversation.versionCount > 1) ||
    (conversation.versions && conversation.versions.length > 1)

  return (
    <div className="bg-white border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow h-full flex flex-col">
      <Link href={`/posts/${conversation.slug}`} className="block flex-1">
        <div className="relative w-full h-28 sm:h-32 bg-muted shrink-0">
          {conversation.featureImage ? (
            <Image
              src={conversation.featureImage}
              alt={conversation.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <GradientCover
              title={conversation.title}
              categorySlug={conversation.categorySlug}
              className="h-full w-full"
            />
          )}
        </div>

        {/* Card Content */}
        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-lg text-foreground line-clamp-2">{conversation.title}</h3>
            <div
              className="text-sm text-muted-foreground line-clamp-2"
              dangerouslySetInnerHTML={{ __html: conversation.description }}
            />
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
      </Link>

      {/* Multi-part series label */}
      {showParts && (
        <div className="px-6 pb-4 pt-0 border-t border-border/50 mt-auto">
          {conversation.versions && conversation.versions.length > 1 ? (
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs text-muted-foreground">
              <span className="mr-1">Parts:</span>
              {[...conversation.versions]
                .sort((a, b) => a.version - b.version)
                .map((v, i, arr) => (
                  <span key={v.slug}>
                    <Link
                      href={`/posts/${v.slug}`}
                      className="hover:text-foreground underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Part {v.version}
                    </Link>
                    {i < arr.length - 1 && <span className="mx-1">·</span>}
                  </span>
                ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{conversation.versionCount} parts</p>
          )}
        </div>
      )}
    </div>
  )
}
