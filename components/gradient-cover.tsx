"use client"

interface GradientCoverProps {
  title: string
  categorySlug?: string | null
  className?: string
}

export default function GradientCover({ className = "" }: GradientCoverProps) {
  return (
    <div
      className={`relative overflow-hidden bg-violet-50 ${className}`}
    />
  )
}
