"use client"

import { getGradientColors } from "@/lib/gradient-cover"

interface GradientCoverProps {
  title: string
  categorySlug?: string | null
  className?: string
}

export default function GradientCover({ title, categorySlug, className = "" }: GradientCoverProps) {
  const [color1, color2] = getGradientColors(categorySlug, title)

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
      }}
    />
  )
}
