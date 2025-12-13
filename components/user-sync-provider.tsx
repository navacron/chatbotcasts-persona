"use client"

import { useUser } from "@clerk/nextjs"
import { useEffect, useState } from "react"

/**
 * Component that automatically syncs Clerk user to database after sign-in
 * This ensures users exist in public.users table when they authenticate
 */
export default function UserSyncProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser()
  const [isSynced, setIsSynced] = useState(false)

  useEffect(() => {
    if (!isLoaded || !user || isSynced) return

    const syncUser = async () => {
      try {
        const response = await fetch("/api/sync-user", {
          method: "POST",
        })

        if (response.ok) {
          const data = await response.json()
          console.log("[user-sync] User synced to database:", data)
          setIsSynced(true)
        } else {
          console.error("[user-sync] Failed to sync user")
        }
      } catch (error) {
        console.error("[user-sync] Error syncing user:", error)
      }
    }

    syncUser()
  }, [user, isLoaded, isSynced])

  return <>{children}</>
}


