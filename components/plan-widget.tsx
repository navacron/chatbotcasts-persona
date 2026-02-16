"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RefreshCw, ChevronDown, ChevronUp, Lock, Unlock, ChevronLeft, ChevronRight } from "lucide-react"
import * as Collapsible from "@radix-ui/react-collapsible"
import { cn } from "@/lib/utils"

interface PlanWidgetProps {
  initialPlan?: string
  conversationTitle: string
  onPlanChange: (plan: string) => void
  onFocusedLineChange: (lineIndex: number) => void
  focusedLineIndex: number
  isGenerating?: boolean
  onRegeneratePlan: () => void
  // Topic progression controls
  messagesPerTopic: number
  onMessagesPerTopicChange: (count: number) => void
  messagesSinceLastAdvance: number
  isTopicLocked: boolean
  onTopicLockToggle: () => void
  onPreviousTopic: () => void
  onNextTopic: () => void
}

export default function PlanWidget({
  initialPlan = "",
  conversationTitle,
  onPlanChange,
  onFocusedLineChange,
  focusedLineIndex,
  isGenerating = false,
  onRegeneratePlan,
  messagesPerTopic,
  onMessagesPerTopicChange,
  messagesSinceLastAdvance,
  isTopicLocked,
  onTopicLockToggle,
  onPreviousTopic,
  onNextTopic,
}: PlanWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [planText, setPlanText] = useState(initialPlan)

  // Update local state when initialPlan changes
  useEffect(() => {
    setPlanText(initialPlan)
  }, [initialPlan])

  // Parse plan lines (clean lines only)
  const planLines = planText
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  // Get current focused line text
  const currentLineText =
    planLines.length > 0 && focusedLineIndex < planLines.length
      ? planLines[focusedLineIndex].replace(/^\d+\.\s*/, "").replace(/^>\s*/, "")
      : ""

  // Generate textarea value with > marker
  const planWithMarkers = planText
    .split("\n")
    .map((line, i) => {
      const trimmed = line.trim()
      if (!trimmed) return line // Keep empty lines as-is

      // Find which non-empty line index this is
      const nonEmptyIndex = planText
        .split("\n")
        .slice(0, i)
        .filter((l) => l.trim().length > 0).length

      if (nonEmptyIndex === focusedLineIndex) {
        return `> ${trimmed}`
      }
      return `  ${trimmed}`
    })
    .join("\n")

  const handlePlanChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawValue = e.target.value

    // Strip markers before saving
    const cleaned = rawValue
      .split("\n")
      .map((line) => {
        if (line.startsWith("> ")) return line.substring(2)
        if (line.startsWith("  ")) return line.substring(2)
        return line
      })
      .join("\n")

    setPlanText(cleaned)
    onPlanChange(cleaned)
  }

  const totalTopics = planLines.length
  const currentTopicShort =
    currentLineText.length > 40 ? currentLineText.substring(0, 40) + "..." : currentLineText

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground flex items-center gap-2 flex-wrap">
                <span>📋 Discussion Plan</span>
                {currentLineText && (
                  <span className="text-xs font-normal text-muted-foreground">
                    • Topic {focusedLineIndex + 1}/{totalTopics}: {currentTopicShort}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onTopicLockToggle}
                disabled={isGenerating}
                className="h-8 w-8 p-0"
                title={isTopicLocked ? "Unlock auto-advance" : "Lock topic (disable auto-advance)"}
              >
                {isTopicLocked ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegeneratePlan}
                disabled={isGenerating}
                className="h-8 w-8 p-0"
                title="Regenerate plan"
              >
                <RefreshCw className={cn("h-4 w-4", isGenerating && "animate-spin")} />
              </Button>
              <Collapsible.Trigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </Collapsible.Trigger>
            </div>
          </div>
        </CardHeader>

        <Collapsible.Content>
          <CardContent className="pt-0 space-y-3">
            {/* Single textarea with > marker */}
            <Textarea
              value={planWithMarkers}
              onChange={handlePlanChange}
              className="min-h-[100px] font-mono text-sm leading-relaxed"
              placeholder="1. Topic one&#10;2. Topic two&#10;3. Topic three..."
            />

            {/* Compact control strip */}
            <div className="flex items-center justify-between gap-4 text-xs flex-wrap">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onPreviousTopic}
                  disabled={focusedLineIndex === 0}
                  className="h-7 px-2"
                >
                  <ChevronLeft className="h-3 w-3 mr-1" />
                  Prev
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onNextTopic}
                  disabled={focusedLineIndex >= totalTopics - 1}
                  className="h-7 px-2"
                >
                  Next
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
                <span className="text-muted-foreground">
                  Topic {focusedLineIndex + 1}/{totalTopics}
                </span>
              </div>

              {/* Auto-advance controls */}
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Auto-advance:</span>
                <Select
                  value={messagesPerTopic.toString()}
                  onValueChange={(value) => onMessagesPerTopicChange(parseInt(value, 10))}
                  disabled={isTopicLocked}
                >
                  <SelectTrigger className="h-7 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        Every {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Badge variant={isTopicLocked ? "secondary" : "default"} className="text-xs">
                  {isTopicLocked ? "Locked" : `${messagesPerTopic - messagesSinceLastAdvance} left`}
                </Badge>
              </div>
            </div>

            {/* Progress indicator (when auto-advancing) */}
            {!isTopicLocked && (
              <div className="flex gap-1">
                {Array.from({ length: messagesPerTopic }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i < messagesSinceLastAdvance ? "bg-blue-500" : "bg-gray-200"
                    )}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Collapsible.Content>
      </Card>
    </Collapsible.Root>
  )
}
