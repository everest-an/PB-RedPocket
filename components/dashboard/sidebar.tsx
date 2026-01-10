"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Gift, Users, Settings, LogOut, ChevronLeft, Wallet } from "lucide-react"
import { useState } from "react"

const menuItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/dashboard" },
  { icon: Gift, label: "Campaigns", href: "/dashboard/campaigns" },
  { icon: Users, label: "Claims", href: "/dashboard/claims" },
  { icon: Wallet, label: "Wallet", href: "/dashboard/wallet" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "h-screen glass-strong border-r border-white/10 flex flex-col transition-all duration-300",
        collapsed ? "w-20" : "w-64",
      )}
    >
      {/* Logo */}
      <div className="p-6 flex items-center justify-between border-b border-white/10">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-3">
            <Image src="/images/logo-20core.png" alt="Protocol Banks" width={32} height={32} className="rounded-lg" />
            <Image
              src="/images/logo-20mark-20text-20white.png"
              alt="Protocol Banks"
              width={120}
              height={24}
              className="h-5 w-auto"
            />
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="mx-auto">
            <Image src="/images/logo-20core.png" alt="Protocol Banks" width={32} height={32} className="rounded-lg" />
          </Link>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <ChevronLeft className={cn("w-5 h-5 text-neutral-400 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                isActive
                  ? "bg-gradient-to-r from-orange-500/20 to-pink-500/20 text-white border border-orange-500/30"
                  : "text-neutral-400 hover:text-white hover:bg-white/5",
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/10">
        <button
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-all w-full",
          )}
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  )
}
