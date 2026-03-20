"use client"

import { textToAsciiArt } from "@/lib/ascii-art"
import { getGradientColors } from "@/lib/gradient-cover"

interface GradientCoverProps {
  title: string
  categorySlug?: string | null
  className?: string
}

export default function GradientCover({ title, categorySlug, className = "" }: GradientCoverProps) {
  const [from, to] = getGradientColors(categorySlug, title)
  const asciiRows = textToAsciiArt(title, 8)

  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center gap-0 py-2 ${className}`}
      style={{
        background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
      }}
    >
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.06] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.4'%3E%3Cpath d='M12 0L24 12 12 24 0 12z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      {/* ASCII art of title */}
      <pre
        className="relative font-mono text-[7px] sm:text-[9px] leading-[1.1] text-white/95 tracking-tighter select-none max-w-full overflow-hidden px-1"
        style={{ fontFamily: "ui-monospace, monospace" }}
      >
        {asciiRows.map((row, i) => (
          <span key={i} className="block">
            {row}
          </span>
        ))}
      </pre>
    </div>
  )
}
