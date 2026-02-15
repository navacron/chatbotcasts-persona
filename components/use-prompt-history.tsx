"use client"

import { useState, useEffect } from "react"

export interface PromptHistoryItem {
  id: string
  content: string
  timestamp: Date
}

const HISTORY_KEY = "test-prompt-history"
const MAX_HISTORY_ITEMS = 10

/**
 * Load prompt history from localStorage
 */
const loadHistoryFromStorage = (): PromptHistoryItem[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    // Validate and convert timestamps
    return parsed
      .filter((item) => item.id && item.content && item.timestamp)
      .map((item) => ({
        ...item,
        timestamp: new Date(item.timestamp),
      }))
  } catch (error) {
    console.warn("Failed to load prompt history:", error)
    return []
  }
}

/**
 * Save prompt history to localStorage
 */
const saveHistoryToStorage = (history: PromptHistoryItem[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
  } catch (error) {
    console.warn("Failed to save prompt history:", error)
  }
}

/**
 * Custom hook for managing prompt history with localStorage persistence
 */
export function usePromptHistory() {
  const [history, setHistory] = useState<PromptHistoryItem[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    setHistory(loadHistoryFromStorage())
  }, [])

  /**
   * Add a new prompt to history (FIFO - keeps last 10)
   */
  const addPrompt = (content: string) => {
    const newItem: PromptHistoryItem = {
      id: Date.now().toString(),
      content: content.trim(),
      timestamp: new Date(),
    }

    setHistory((prev) => {
      // Add new item at the beginning, keep only last MAX_HISTORY_ITEMS
      const updated = [newItem, ...prev].slice(0, MAX_HISTORY_ITEMS)
      saveHistoryToStorage(updated)
      return updated
    })
  }

  /**
   * Clear all prompt history
   */
  const clearHistory = () => {
    setHistory([])
    try {
      localStorage.removeItem(HISTORY_KEY)
    } catch (error) {
      console.warn("Failed to clear prompt history:", error)
    }
  }

  return {
    history,
    addPrompt,
    clearHistory,
  }
}
