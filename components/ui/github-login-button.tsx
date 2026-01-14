"use client"

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface GitHubUser {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar: string
  platform: string
  platformId: string
}

interface GitHubLoginButtonProps {
  redPocketId?: string
  onLogin?: (user: GitHubUser) => void
  onLogout?: () => void
  className?: string
}

export function GitHubLoginButton({ redPocketId, onLogin, onLogout, className }: GitHubLoginButtonProps) {
  const [user, setUser] = useState<GitHubUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()
      if (data.authenticated && data.platform === 'github') {
        setUser(data.user)
        onLogin?.(data.user)
      }
    } catch (err) {
      console.error('Auth check failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = () => {
    const params = new URLSearchParams()
    params.set('redirect', '/claim')
    if (redPocketId) {
      params.set('redPocketId', redPocketId)
    }
    window.location.href = `/api/auth/github?${params.toString()}`
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/me', { method: 'DELETE' })
      setUser(null)
      onLogout?.()
    } catch (err) {
      console.error('Logout failed:', err)
    }
  }

  if (loading) {
    return (
      <button 
        disabled 
        className={cn(
          "flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
          "bg-[#24292e]/50 text-white/50 cursor-not-allowed",
          className
        )}
      >
        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        Loading...
      </button>
    )
  }

  if (user) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#24292e]/30 border border-[#24292e]/50">
          <img 
            src={user.avatar} 
            alt={user.login} 
            className="w-6 h-6 rounded-full"
          />
          <span className="text-sm text-white">{user.login}</span>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-2 text-sm text-white/60 hover:text-white transition-colors"
        >
          Logout
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleLogin}
      className={cn(
        "flex items-center justify-center gap-2 px-4 py-3 rounded-xl",
        "bg-[#24292e] hover:bg-[#2f363d] text-white",
        "border border-[#24292e] hover:border-[#444d56]",
        "transition-all duration-200",
        className
      )}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
      Login with GitHub
    </button>
  )
}
