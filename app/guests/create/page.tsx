'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Header from '@/components/header'
import { useState } from 'react'
import { ArrowLeft, Upload, X } from 'lucide-react'
import Link from 'next/link'

export default function CreateGuestPage() {
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [personality, setPersonality] = useState('')
  const [links, setLinks] = useState<string[]>([''])
  const [documents, setDocuments] = useState<string[]>([''])
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; size: number }[]>([])
  const [published, setPublished] = useState(false)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      const newFiles = Array.from(files).map((file) => ({
        name: file.name,
        size: file.size,
      }))
      setUploadedFiles([...uploadedFiles, ...newFiles])
    }
    event.target.value = ''
  }

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))
  }

  const handlePublish = () => {
    if (name.trim() && personality.trim()) {
      setPublished(true)
    }
  }

  if (published) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
          <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center space-y-4">
            <div className="text-6xl mb-4">✓</div>
            <h2 className="text-2xl font-bold text-green-900">Guest Published!</h2>
            <p className="text-green-700">
              Your AI persona is now available for others to use in conversations.
            </p>
            <div className="flex gap-4 justify-center pt-4">
              <Link href="/guests">
                <Button variant="outline">View My Guests</Button>
              </Link>
              <Button>Create Another</Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="max-w-2xl mx-auto px-4 md:px-8 py-12">
        <Link href="/guests" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Guests
        </Link>

        <div className="bg-white border border-border rounded-xl p-8 space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Create AI Guest Persona</h1>
            <p className="text-muted-foreground">
              Define a custom AI persona that others can use in their conversations
            </p>
          </div>

          <div className="space-y-6">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Persona Name *</label>
              <Input
                placeholder="e.g., Dr. Future Tech"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Title / Expertise</label>
              <Input
                placeholder="e.g., AI Futurist, Tech Commentator"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Personality */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Personality & Context *
              </label>
              <textarea
                placeholder="Describe their background, expertise, perspective, and communication style..."
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                className="w-full min-h-32 p-3 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Reference Links */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">Reference Links</label>
              {links.map((link, i) => (
                <Input
                  key={i}
                  placeholder={`Link ${i + 1}`}
                  value={link}
                  onChange={(e) => {
                    const newLinks = [...links]
                    newLinks[i] = e.target.value
                    setLinks(newLinks)
                  }}
                  className="h-10"
                />
              ))}
            </div>

            {/* Knowledge Documents */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">Knowledge Documents</label>
              <div className="space-y-3">
                {documents.map((doc, i) => (
                  <Input
                    key={i}
                    placeholder={`Document ${i + 1}`}
                    value={doc}
                    onChange={(e) => {
                      const newDocs = [...documents]
                      newDocs[i] = e.target.value
                      setDocuments(newDocs)
                    }}
                    className="h-10"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-foreground">Upload Documents (PDF, TXT, DOCX)</label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.docx,.doc"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Click to upload or drag & drop</span>
                  <span className="text-xs text-muted-foreground">PDF, TXT, or DOCX files</span>
                </label>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-foreground">Uploaded Files ({uploadedFiles.length})</div>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-secondary p-3 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <button
                          onClick={() => removeFile(index)}
                          className="ml-4 text-destructive hover:bg-destructive/10 p-2 rounded transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <Link href="/guests" className="flex-1">
                <Button variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button
                onClick={handlePublish}
                disabled={!name.trim() || !personality.trim()}
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:opacity-90 disabled:opacity-50"
              >
                Publish Guest
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
