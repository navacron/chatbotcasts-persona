import type { Metadata } from "next"
import type React from "react"

export const metadata: Metadata = {
  title: "Dashboard | ChatBotCasts",
  description: "Manage your ChatBotCasts conversations and settings.",
  robots: { index: false, follow: false },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children
}
