'use client'

import { FileText, MessageSquare, Headphones, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SectionNavigationProps {
  hasAudio: boolean
  hasInsights?: boolean
}

interface Section {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  conditional?: 'audio' | 'insights'
}

const sections: Section[] = [
  { id: 'summary', label: 'Summary', icon: FileText },
  { id: 'insights', label: 'Insights', icon: Lightbulb, conditional: 'insights' },
  { id: 'conversation', label: 'Conversation', icon: MessageSquare },
  { id: 'audio', label: 'Audio', icon: Headphones, conditional: 'audio' },
]

export default function SectionNavigation({ hasAudio, hasInsights = false }: SectionNavigationProps) {
  const visibleSections = sections.filter((section) => {
    if (section.conditional === 'audio') return hasAudio
    if (section.conditional === 'insights') return hasInsights
    return true
  })

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault()
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Update URL hash without jumping
      window.history.pushState(null, '', `#${sectionId}`)
    }
  }

  return (
    <nav
      aria-label="Section navigation"
      className="border-b border-border bg-background sticky top-0 z-10 mb-8"
    >
      <div className="flex flex-wrap gap-2 py-4">
        {visibleSections.map((section) => {
          const Icon = section.icon
          return (
            <Button
              key={section.id}
              variant="ghost"
              size="sm"
              asChild
            >
              <a
                href={`#${section.id}`}
                onClick={(e) => handleClick(e, section.id)}
                className="inline-flex items-center gap-2"
              >
                <Icon className="h-4 w-4" />
                <span>{section.label}</span>
              </a>
            </Button>
          )
        })}
      </div>
    </nav>
  )
}
