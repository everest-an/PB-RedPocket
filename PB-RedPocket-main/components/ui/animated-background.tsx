"use client"

import { useEffect, useRef } from "react"

interface AnimatedBackgroundProps {
  variant?: "warm" | "cool"
}

export function AnimatedBackground({ variant = "warm" }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animationFrameId: number
    let particles: Array<{
      x: number
      y: number
      radius: number
      vx: number
      vy: number
      color: string
    }> = []

    const colors =
      variant === "warm"
        ? ["rgba(255, 120, 80, 0.3)", "rgba(255, 80, 150, 0.3)", "rgba(255, 180, 50, 0.25)", "rgba(200, 80, 200, 0.25)"]
        : [
            "rgba(80, 200, 255, 0.3)",
            "rgba(80, 120, 255, 0.3)",
            "rgba(100, 255, 220, 0.25)",
            "rgba(150, 100, 255, 0.25)",
          ]

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    const initParticles = () => {
      particles = []
      const particleCount = Math.floor((canvas.width * canvas.height) / 15000)
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 100 + 50,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          color: colors[Math.floor(Math.random() * colors.length)],
        })
      }
    }

    const animate = () => {
      ctx.fillStyle = "rgba(10, 10, 20, 0.1)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      particles.forEach((particle) => {
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.x < -particle.radius) particle.x = canvas.width + particle.radius
        if (particle.x > canvas.width + particle.radius) particle.x = -particle.radius
        if (particle.y < -particle.radius) particle.y = canvas.height + particle.radius
        if (particle.y > canvas.height + particle.radius) particle.y = -particle.radius

        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius)
        gradient.addColorStop(0, particle.color)
        gradient.addColorStop(1, "transparent")

        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fillStyle = gradient
        ctx.fill()
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    resize()
    animate()

    window.addEventListener("resize", resize)

    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [variant])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }} />
}
