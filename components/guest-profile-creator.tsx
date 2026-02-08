'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Plus, Trash2 } from 'lucide-react'

interface GuestProfileCreatorProps {
  onSave: (profile: any) => void
  onCancel: () => void
  existingProfile?: any
}

export default function GuestProfileCreator({
  onSave,
  onCancel,
  existingProfile,
}: GuestProfileCreatorProps) {
  const [name, setName] = useState(existingProfile?.name || '')
  const [title, setTitle] = useState(existingProfile?.title || '')
  const [personalityPrompt, setPersonalityPrompt] = useState(
    existingProfile?.personalityPrompt || ''
  )
  const [links, setLinks] = useState<string[]>(existingProfile?.links || [''])
  const [documents, setDocuments] = useState<string[]>(existingProfile?.documents || [''])

  const handleSave = () => {
    if (name.trim() && personalityPrompt.trim()) {
      onSave({
        id: `guest-${Date.now()}`,
        name,
        title,
        personalityPrompt,
        links: links.filter((l) => l.trim()),
        documents: documents.filter((d) => d.trim()),
        avatar: '👤',
        color: 'from-violet-500 to-purple-600',
      })
      onCancel()
    }
  }

  const handleAddLink = () => setLinks([...links, ''])
  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }
  const handleUpdateLink = (index: number, value: string) => {
    const newLinks = [...links]
    newLinks[index] = value
    setLinks(newLinks)
  }

  const handleAddDocument = () => setDocuments([...documents, ''])
  const handleRemoveDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index))
  }
  const handleUpdateDocument = (index: number, value: string) => {
    const newDocuments = [...documents]
    newDocuments[index] = value
    setDocuments(newDocuments)
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-card to-card/50 border border-border rounded-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Create Custom Agent Persona</h3>
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Agent Name *</label>
        <Input
          placeholder="e.g., Sarah Chen"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="bg-background border-border/50"
        />
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Title / Role</label>
        <Input
          placeholder="e.g., Data Scientist, Entrepreneur"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-background border-border/50"
        />
      </div>

      {/* Personality Prompt */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Personality & Context *</label>
        <textarea
          placeholder="Describe this persona's background, expertise, perspective, and communication style. This will guide the AI's responses."
          value={personalityPrompt}
          onChange={(e) => setPersonalityPrompt(e.target.value)}
          className="w-full h-24 p-3 bg-background border border-border/50 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Links */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Reference Links</label>
          <button
            onClick={handleAddLink}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {links.map((link, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="https://example.com"
                value={link}
                onChange={(e) => handleUpdateLink(index, e.target.value)}
                className="flex-1 bg-background border-border/50 text-sm"
              />
              {links.length > 1 && (
                <button
                  onClick={() => handleRemoveLink(index)}
                  className="text-destructive hover:bg-destructive/10 p-2 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">Knowledge Documents</label>
          <button
            onClick={handleAddDocument}
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <div key={index} className="flex gap-2">
              <Input
                placeholder="Paste document text or file reference"
                value={doc}
                onChange={(e) => handleUpdateDocument(index, e.target.value)}
                className="flex-1 bg-background border-border/50 text-sm"
              />
              {documents.length > 1 && (
                <button
                  onClick={() => handleRemoveDocument(index)}
                  className="text-destructive hover:bg-destructive/10 p-2 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={!name.trim() || !personalityPrompt.trim()}
          className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50"
        >
          Save Persona
        </Button>
      </div>
    </div>
  )
}
