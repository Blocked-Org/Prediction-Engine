"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface LoadingOverlayProps {
  absolute?: boolean
  className?: string
}

const MESSAGES = [
  "Initializing simulation engines...",
  "Loading Neo4j knowledge graph...",
  "Preparing AI analytics...",
  "Almost ready...",
]

export function LoadingOverlay({ absolute = false, className }: LoadingOverlayProps) {
  const [progress, setProgress] = React.useState(0)
  const [messageIndex, setMessageIndex] = React.useState(0)

  // Progress animation: smoothly increment progress
  React.useEffect(() => {
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) return prev
        const increment = Math.random() * 12 + 4 // random smooth steps
        return Math.min(prev + increment, 98)
      })
    }, 450)

    return () => clearInterval(progressTimer)
  }, [])

  // Rotate messages every 2500ms
  React.useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length)
    }, 2500)

    return () => clearInterval(messageTimer)
  }, [])

  return (
    <div
      className={cn(
        "z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all duration-300",
        absolute ? "absolute inset-0 rounded-xl" : "fixed inset-0",
        className
      )}
    >
      <div className="flex flex-col items-center max-w-sm px-6 text-center select-none">
        
        {/* Animated BrandSim Logo */}
        <div className="flex items-center gap-1.5 text-3xl font-extrabold tracking-wider animate-bounce mb-6">
          <span className="font-normal text-white">Brand</span>
          <span className="font-extrabold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
            Sim
          </span>
        </div>

        {/* Gradient Progress Bar Container */}
        <div className="w-64 h-1.5 bg-slate-900 border border-slate-800/80 rounded-full overflow-hidden mb-4 relative">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Rotating Status Messages in Typewriter Font with Blinking Cursor */}
        <div className="h-5 flex items-center justify-center">
          <p className="text-xs text-indigo-300 font-mono tracking-wide flex items-center gap-1">
            <span>{MESSAGES[messageIndex]}</span>
            <span className="inline-block w-1.5 h-3.5 bg-indigo-300 animate-cursor-blink shrink-0" />
          </p>
        </div>

      </div>
    </div>
  )
}
