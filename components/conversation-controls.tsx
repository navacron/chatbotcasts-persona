import { Button } from '@/components/ui/button'
import { RotateCcw } from 'lucide-react'

interface ConversationControlsProps {
  messageCount: number
  mode: string
  onReset: () => void
}

export default function ConversationControls({
  messageCount,
  mode,
  onReset,
}: ConversationControlsProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Messages</p>
        <p className="text-2xl font-bold text-foreground">{messageCount}</p>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Mode</p>
        <p className="text-sm text-foreground capitalize">{mode}</p>
      </div>
      <Button
        onClick={onReset}
        variant="outline"
        size="sm"
        className="w-full mt-4"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset
      </Button>
    </div>
  )
}
