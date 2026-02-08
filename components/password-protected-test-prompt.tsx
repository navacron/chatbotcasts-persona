"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Lock, AlertCircle } from "lucide-react"
import TestPromptClient from "@/components/test-prompt-client"

export default function PasswordProtectedTestPrompt() {
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [checkingBypass, setCheckingBypass] = useState(true)

  // When no password is configured (e.g. local dev), allow access without prompting
  useEffect(() => {
    let cancelled = false
    fetch("/api/verify-test-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.authenticated) setIsAuthenticated(true)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCheckingBypass(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/verify-test-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (data.authenticated) {
        setIsAuthenticated(true)
      } else {
        setError("Incorrect password. Please try again.")
        setPassword("")
      }
    } catch (err) {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (isAuthenticated) {
    return <TestPromptClient />
  }

  if (checkingBypass) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 flex justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-24">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle>Password Required</CardTitle>
          <CardDescription>This test UI is password protected. Please enter the password to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                disabled={isLoading}
                autoFocus
              />
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={!password || isLoading}>
              {isLoading ? "Verifying..." : "Access Test UI"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
