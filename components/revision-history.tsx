"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { History, Loader2, RotateCcw } from "lucide-react"

interface Revision {
  id: string
  conversation_id: string
  content: { title?: string; description?: string; topic?: string; data?: { messages?: unknown[] } }
  created_at: string
  editor_id?: string | null
}

interface RevisionHistoryProps {
  conversationId: string
  onRestored?: (updatedConversation: any) => void
  className?: string
}

export default function RevisionHistory({ conversationId, onRestored, className = "" }: RevisionHistoryProps) {
  const router = useRouter()
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!conversationId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch(`/api/conversations/by-id/${conversationId}/revisions`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return
        if (data.error) {
          setError(data.error)
          setRevisions([])
        } else {
          setRevisions(data.revisions ?? [])
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load")
          setRevisions([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [conversationId])

  const handleRestore = async (revisionId: string) => {
    setRestoringId(revisionId)
    setError(null)
    try {
      const res = await fetch(`/api/conversations/by-id/${conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restoreRevisionId: revisionId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Restore failed")
      if (data.conversation && onRestored) {
        onRestored(data.conversation)
      }
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed")
    } finally {
      setRestoringId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className={`rounded-lg border bg-muted/30 p-4 ${className}`}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading previous versions…
        </div>
      </div>
    )
  }

  if (revisions.length === 0) {
    return (
      <div className={`rounded-lg border bg-muted/30 p-4 ${className}`}>
        <h3 className="flex items-center gap-2 font-semibold text-sm mb-2">
          <History className="h-4 w-4" />
          Previous versions
        </h3>
        <p className="text-sm text-muted-foreground">No previous versions yet. Edits will be saved here.</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border bg-muted/30 p-4 ${className}`}>
      <h3 className="flex items-center gap-2 font-semibold text-sm mb-3">
        <History className="h-4 w-4" />
        Previous versions
      </h3>
      {error && (
        <p className="text-sm text-destructive mb-2">{error}</p>
      )}
      <ul className="space-y-2">
        {revisions.map((rev) => (
          <li
            key={rev.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded border bg-background px-3 py-2 text-sm"
          >
            <div>
              <span className="font-medium text-muted-foreground">
                {formatDate(rev.created_at)}
              </span>
              {rev.content?.title && (
                <span className="ml-2 text-foreground truncate max-w-[200px] inline-block align-middle" title={rev.content.title}>
                  — {rev.content.title}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRestore(rev.id)}
              disabled={restoringId !== null}
              className="shrink-0"
            >
              {restoringId === rev.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restore
                </>
              )}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
