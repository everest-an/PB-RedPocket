"use client"

import { useState } from "react"
import { RedPocketCard } from "@/components/redpocket/red-pocket-card"
import { PlatformIcon } from "@/components/ui/platform-icon"
import { AnimatedBackground } from "@/components/ui/animated-background"
import Link from "next/link"
import Image from "next/image"

type ColorTheme = "fire" | "ocean"

export default function HomePage() {
  const [platform, setPlatform] = useState<"telegram" | "discord" | "whatsapp" | "github">("telegram")
  const [isLucky, setIsLucky] = useState(false)
  const [key, setKey] = useState(0)
  const [theme, setTheme] = useState<ColorTheme>("fire")

  const demoRedPocket = {
    id: "demo_123",
    senderName: "Protocol Banks",
    senderAvatar: "/images/logo-20core.png",
    amount: 50,
    token: "USDC",
    platform,
    message: "Welcome to our community! Claim your reward now.",
    tag: "Marketing",
    totalCount: 100,
    claimedCount: 42,
    isLuckyDraw: isLucky,
    colorTheme: theme,
  }

  const handleReset = () => {
    setKey((prev) => prev + 1)
  }

  return (
    <main className="min-h-screen bg-black relative overflow-hidden">
      <AnimatedBackground variant={theme === "fire" ? "warm" : "cool"} />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        {/* Header with dashboard link */}
        <div className="absolute top-6 right-6">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl text-sm font-medium bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition-all"
          >
            Enterprise Dashboard
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image src="/images/logo-20core.png" alt="Protocol Banks" width={40} height={40} className="rounded-lg" />
            <Image
              src="/images/logo-20mark-20text-20white.png"
              alt="Protocol Banks"
              width={180}
              height={32}
              className="h-8 w-auto"
            />
          </div>
          <p className="text-neutral-500 text-sm">RedPocket Component for WhatsApp, Discord, Telegram, GitHub</p>
        </div>

        {/* Demo Controls */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center flex-wrap justify-center">
          <div className="flex gap-2 p-1 rounded-xl bg-neutral-900/80 backdrop-blur-xl border border-neutral-800">
            <button
              onClick={() => {
                setTheme("fire")
                handleReset()
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                theme === "fire"
                  ? "bg-gradient-to-r from-orange-500 to-pink-500 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-500 to-pink-500" />
              Fire
            </button>
            <button
              onClick={() => {
                setTheme("ocean")
                handleReset()
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                theme === "ocean"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-800"
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500" />
              Ocean
            </button>
          </div>

          {/* Platform selector */}
          <div className="flex gap-2 p-1 rounded-xl bg-neutral-900/80 backdrop-blur-xl border border-neutral-800">
            {(["telegram", "discord", "whatsapp", "github"] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPlatform(p)
                  handleReset()
                }}
                className={`p-2.5 rounded-lg transition-all ${
                  platform === p
                    ? theme === "fire"
                      ? "bg-gradient-to-r from-orange-500 to-pink-500"
                      : "bg-gradient-to-r from-cyan-500 to-blue-500"
                    : "hover:bg-neutral-800"
                }`}
                title={p}
              >
                <PlatformIcon platform={p} className="w-5 h-5" />
              </button>
            ))}
          </div>

          {/* Lucky draw toggle */}
          <button
            onClick={() => {
              setIsLucky(!isLucky)
              handleReset()
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border backdrop-blur-xl ${
              isLucky
                ? theme === "fire"
                  ? "bg-gradient-to-r from-orange-500/20 to-pink-500/20 border-orange-500/50 text-orange-400"
                  : "bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/50 text-cyan-400"
                : "bg-neutral-900/80 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700"
            }`}
          >
            {isLucky ? "Lucky Draw" : "Fixed Amount"}
          </button>

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="px-4 py-2.5 rounded-xl text-sm font-medium bg-neutral-900/80 backdrop-blur-xl border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-all"
          >
            Reset Demo
          </button>
        </div>

        {/* Red Pocket Component */}
        <RedPocketCard {...demoRedPocket} key={key} />

        {/* Footer */}
        <div className="mt-12 text-center space-y-2">
          <p className="text-neutral-600 text-xs">Powered by Account Abstraction | Gas-free claiming</p>
          <p className="text-neutral-700 text-xs">protocolbanks.com</p>
        </div>
      </div>
    </main>
  )
}
