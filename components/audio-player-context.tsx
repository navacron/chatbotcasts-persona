"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface AudioPlayerContextType {
  currentlyPlaying: number | null
  setCurrentlyPlaying: (index: number | null) => void
  playbackRate: number
  setPlaybackRate: (rate: number) => void
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined)

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<number | null>(null)
  const [playbackRate, setPlaybackRate] = useState<number>(1.0)

  return (
    <AudioPlayerContext.Provider
      value={{
        currentlyPlaying,
        setCurrentlyPlaying,
        playbackRate,
        setPlaybackRate,
      }}
    >
      {children}
    </AudioPlayerContext.Provider>
  )
}

export function useAudioPlayer() {
  const context = useContext(AudioPlayerContext)
  if (context === undefined) {
    throw new Error("useAudioPlayer must be used within an AudioPlayerProvider")
  }
  return context
}
