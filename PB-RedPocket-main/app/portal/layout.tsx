import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "My Rewards - Protocol Bank",
  description: "Manage your rewards across all platforms",
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children
}
