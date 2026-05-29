'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'var(--font-sans)',
})

interface Props {
  chart: string
  id: string
}

export function ArchitectureDiagram({ chart, id }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgContent, setSvgContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const renderChart = async () => {
      try {
        if (!chart) return
        const { svg } = await mermaid.render(`mermaid-${id}`, chart)
        if (isMounted) {
          setSvgContent(svg)
          setError(null)
        }
      } catch (e: any) {
        if (isMounted) {
          setError(e?.message || 'Failed to render diagram')
          console.error('Mermaid rendering error:', e)
        }
      }
    }

    renderChart()

    return () => {
      isMounted = false
    }
  }, [chart, id])

  if (error) {
    return (
      <div className="p-4 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive text-sm font-mono overflow-auto">
        {error}
      </div>
    )
  }

  if (!svgContent) {
    return (
      <div className="flex items-center justify-center p-12 min-h-[300px] border border-border/30 rounded-xl bg-muted/20 animate-pulse">
        <span className="text-muted-foreground text-sm">Rendering diagram...</span>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef}
      className="flex justify-center w-full overflow-x-auto overflow-y-hidden p-6 border border-border/30 rounded-xl bg-[#0d1117] shadow-xl custom-scrollbar"
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}
