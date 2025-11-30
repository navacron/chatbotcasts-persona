/**
 * React hook to sync Clerk user to database after sign-in
 * Call this after successful Clerk authentication
 */

import { useEffect, useState } from "react"
import { useUser } from "@clerk/nextjs"

export function useSyncUser() {
  const { user, isLoaded } = useUser()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSynced, setIsSynced] = useState(false)

  useEffect(() => {
    if (!isLoaded || !user || isSynced) return

    const syncUser = async () => {
      setIsSyncing(true)
      try {
        const response = await fetch("/api/sync-user", {
          method: "POST",
        })

        if (response.ok) {
          const data = await response.json()
          console.log("[use-sync-user] User synced:", data)
          setIsSynced(true)
        } else {
          console.error("[use-sync-user] Failed to sync user")
        }
      } catch (error) {
        console.error("[use-sync-user] Error syncing user:", error)
      } finally {
        setIsSyncing(false)
      }
    }

    syncUser()
  }, [user, isLoaded, isSynced])

  return { isSyncing, isSynced }
}

