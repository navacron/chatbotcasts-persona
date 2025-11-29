"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause } from "lucide-react"
import { useAudioPlayer } from "./audio-player-context"

interface PlayAllControlProps {
  messages: Array<{ content: string; audio?: string; role: string }>
}

export default function PlayAllControl({ messages }: PlayAllControlProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const { currentlyPlaying, setCurrentlyPlaying } = useAudioPlayer()
  const audioMessages = messages.filter((msg) => msg.audio)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener("ended", handleEnded)
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener("ended", handleEnded)
      }
    }
  }, [currentlyPlaying])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate
    }
  }, [playbackRate, currentlyPlaying])

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying, currentlyPlaying])

  const handleEnded = () => {
    if (currentlyPlaying !== null && currentlyPlaying < audioMessages.length - 1) {
      setCurrentlyPlaying(currentlyPlaying + 1)
    } else {
      setIsPlaying(false)
      setCurrentlyPlaying(null)
    }
  }

  const handlePlayAll = () => {
    setIsPlaying(!isPlaying)
  }

  const handleMessageSelect = (index: number) => {
    setCurrentlyPlaying(index)
    setIsPlaying(true)
  }

  useEffect(() => {
    if (currentlyPlaying === null && audioMessages.length > 0) {
      setCurrentlyPlaying(0)
    }
  }, [currentlyPlaying, audioMessages.length, setCurrentlyPlaying])

  const getMessagePreview = (content: string) => {
    return content.replace(/<[^>]*>/g, "").substring(0, 30)
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <button
        onClick={handlePlayAll}
        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
      >
        {isPlaying ? (
          <>
            <Pause className="w-4 h-4" /> Pause
          </>
        ) : (
          <>
            <Play className="w-4 h-4" /> Play
          </>
        )}
      </button>

      <select
        value={currentlyPlaying !== null ? currentlyPlaying : ""}
        onChange={(e) => handleMessageSelect(Number(e.target.value))}
        className="px-3 py-2 rounded-lg border border-gray-300 max-w-[250px] text-sm bg-white"
      >
        <option value="" disabled>
          Select message
        </option>
        {audioMessages.map((msg, index) => (
          <option key={index} value={index}>
            {msg.role === "assistant" ? "G" : "H"}
            {index + 1}: {getMessagePreview(msg.content)}...
          </option>
        ))}
      </select>

      <select
        value={playbackRate}
        onChange={(e) => setPlaybackRate(Number(e.target.value))}
        className="px-3 py-2 rounded-lg border border-gray-300 w-20 bg-white"
      >
        <option value="0.5">0.5x</option>
        <option value="1">1x</option>
        <option value="1.5">1.5x</option>
        <option value="2">2x</option>
      </select>

      {currentlyPlaying !== null && (
        <div className="text-sm text-gray-600">
          Playing {currentlyPlaying + 1} of {audioMessages.length}
        </div>
      )}

      {currentlyPlaying !== null && audioMessages[currentlyPlaying]?.audio && (
        <audio ref={audioRef} src={audioMessages[currentlyPlaying].audio} autoPlay />
      )}
    </div>
  )
}
