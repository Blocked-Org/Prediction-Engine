'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

// ─── Configuration ──────────────────────────────────────────────────────────

const SHAPE_COUNT_DESKTOP = 65
const SHAPE_COUNT_MOBILE = 28
const MOUSE_RADIUS = 260
const MOUSE_STRENGTH = 0.018
const CONNECTION_DISTANCE = 180
const CONNECTION_OPACITY = 0.08

// Color palette — emerald, teal, silver, warm amber, soft lavender
const PALETTE = [
  { r: 52, g: 211, b: 153, name: 'emerald' },
  { r: 45, g: 212, b: 191, name: 'teal' },
  { r: 94, g: 234, b: 212, name: 'mint' },
  { r: 209, g: 213, b: 219, name: 'silver' },
  { r: 251, g: 191, b: 36, name: 'amber' },
  { r: 245, g: 158, b: 11, name: 'orange' },
  { r: 167, g: 139, b: 250, name: 'lavender' },
]

// ─── Shape Types ────────────────────────────────────────────────────────────

type ShapeKind = 'hexagon' | 'triangle' | 'ring' | 'diamond' | 'cross' | 'dot' | 'line-segment'

interface GeoShape {
  x: number
  y: number
  baseX: number
  baseY: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: typeof PALETTE[number]
  kind: ShapeKind
  rotation: number
  rotationSpeed: number
  angle: number       // orbit angle
  angleSpeed: number
  drift: number       // orbit radius
  depth: number       // 0-1, affects parallax and brightness
  pulsePhase: number  // for subtle breathing
  pulseSpeed: number
}

const SHAPE_KINDS: ShapeKind[] = ['hexagon', 'triangle', 'ring', 'diamond', 'cross', 'dot', 'line-segment']

function createShape(w: number, h: number): GeoShape {
  const x = Math.random() * w
  const y = Math.random() * h
  const depth = Math.random()
  const kind = SHAPE_KINDS[Math.floor(Math.random() * SHAPE_KINDS.length)]

  // Larger shapes for featured kinds, smaller for dots
  let sizeBase: number
  switch (kind) {
    case 'hexagon': sizeBase = 10 + Math.random() * 16; break
    case 'triangle': sizeBase = 8 + Math.random() * 14; break
    case 'ring': sizeBase = 10 + Math.random() * 20; break
    case 'diamond': sizeBase = 7 + Math.random() * 12; break
    case 'cross': sizeBase = 6 + Math.random() * 10; break
    case 'line-segment': sizeBase = 12 + Math.random() * 22; break
    case 'dot': sizeBase = 2 + Math.random() * 4; break
    default: sizeBase = 4 + Math.random() * 8
  }

  // Deeper shapes are slightly smaller
  const size = sizeBase * (0.5 + depth * 0.5)

  return {
    x, y, baseX: x, baseY: y,
    vx: 0, vy: 0,
    size,
    opacity: (0.12 + Math.random() * 0.35) * (0.4 + depth * 0.6),
    color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    kind,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.012,
    angle: Math.random() * Math.PI * 2,
    angleSpeed: (Math.random() - 0.5) * 0.004,
    drift: 20 + Math.random() * 50,
    depth,
    pulsePhase: Math.random() * Math.PI * 2,
    pulseSpeed: 0.008 + Math.random() * 0.015,
  }
}

// ─── Shape Drawing Functions ────────────────────────────────────────────────

function drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, r: number, g: number, b: number, opacity: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    const px = Math.cos(angle) * size
    const py = Math.sin(angle) * size
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
  ctx.lineWidth = 1.2
  ctx.stroke()
  // Subtle fill
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.08})`
  ctx.fill()
  ctx.restore()
}

function drawTriangle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, r: number, g: number, b: number, opacity: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const angle = (Math.PI * 2 / 3) * i - Math.PI / 2
    const px = Math.cos(angle) * size
    const py = Math.sin(angle) * size
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.06})`
  ctx.fill()
  ctx.restore()
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, _rotation: number, r: number, g: number, b: number, opacity: number) {
  // Outer ring
  ctx.beginPath()
  ctx.arc(x, y, size, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
  ctx.lineWidth = 1.2
  ctx.stroke()
  // Inner ring
  ctx.beginPath()
  ctx.arc(x, y, size * 0.55, 0, Math.PI * 2)
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.4})`
  ctx.lineWidth = 0.8
  ctx.stroke()
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, r: number, g: number, b: number, opacity: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.lineTo(size * 0.6, 0)
  ctx.lineTo(0, size)
  ctx.lineTo(-size * 0.6, 0)
  ctx.closePath()
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.05})`
  ctx.fill()
  ctx.restore()
}

function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, r: number, g: number, b: number, opacity: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.lineTo(0, size)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-size, 0)
  ctx.lineTo(size, 0)
  ctx.stroke()
  ctx.restore()
}

function drawLineSegment(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, rotation: number, r: number, g: number, b: number, opacity: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
  ctx.lineWidth = 1.2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-size, 0)
  ctx.lineTo(size, 0)
  ctx.stroke()
  // Small dot at one end
  ctx.beginPath()
  ctx.arc(size, 0, 1.5, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity * 0.8})`
  ctx.fill()
  ctx.restore()
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, _rotation: number, r: number, g: number, b: number, opacity: number) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2.5)
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${opacity})`)
  gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${opacity * 0.3})`)
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
  ctx.beginPath()
  ctx.arc(x, y, size * 2.5, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()
}

const DRAW_FNS: Record<ShapeKind, typeof drawHexagon> = {
  hexagon: drawHexagon,
  triangle: drawTriangle,
  ring: drawRing,
  diamond: drawDiamond,
  cross: drawCross,
  'line-segment': drawLineSegment,
  dot: drawDot,
}

// ─── Canvas Geometric Shape Layer ───────────────────────────────────────────

function useGeometricCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  mouseRef: React.RefObject<{ x: number; y: number; active: boolean }>
) {
  const shapesRef = useRef<GeoShape[]>([])
  const animFrameRef = useRef<number>(0)
  const reducedMotionRef = useRef(false)
  const timeRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
    reducedMotionRef.current = mql.matches
    const handleMotionChange = (e: MediaQueryListEvent) => { reducedMotionRef.current = e.matches }
    mql.addEventListener('change', handleMotionChange)

    const isMobile = window.innerWidth < 768
    const count = isMobile ? SHAPE_COUNT_MOBILE : SHAPE_COUNT_DESKTOP

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    shapesRef.current = Array.from({ length: count }, () =>
      createShape(window.innerWidth, window.innerHeight)
    )

    let lastTime = 0

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.67, 3)
      lastTime = time
      timeRef.current = time * 0.001 // seconds

      const w = window.innerWidth
      const h = window.innerHeight
      ctx.clearRect(0, 0, w, h)

      const mouse = mouseRef.current
      const isReduced = reducedMotionRef.current
      const shapes = shapesRef.current

      // ── Update shapes ──
      for (const s of shapes) {
        // Organic orbit drift
        if (!isReduced) {
          s.angle += s.angleSpeed * dt
          const targetX = s.baseX + Math.cos(s.angle) * s.drift
          const targetY = s.baseY + Math.sin(s.angle * 0.7 + s.pulsePhase) * s.drift

          s.vx += (targetX - s.x) * 0.004 * dt
          s.vy += (targetY - s.y) * 0.004 * dt

          // Rotation
          s.rotation += s.rotationSpeed * dt
        }

        // Mouse interaction
        if (mouse?.active && !isMobile && !isReduced) {
          const dx = s.x - mouse.x
          const dy = s.y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < MOUSE_RADIUS && dist > 1) {
            const force = (1 - dist / MOUSE_RADIUS) * MOUSE_STRENGTH * dt

            // Shapes orbit around cursor with attraction + tangential swirl
            const nx = dx / dist
            const ny = dy / dist

            // Push away slightly + strong tangential
            s.vx += nx * force * 0.3 - ny * force * 0.8
            s.vy += ny * force * 0.3 + nx * force * 0.8

            // Speed up rotation near cursor
            s.rotation += s.rotationSpeed * force * 40
          }
        }

        // Damping
        s.vx *= 0.955
        s.vy *= 0.955

        // Integrate
        s.x += s.vx * dt
        s.y += s.vy * dt

        // Wrap edges
        const pad = 60
        if (s.x < -pad) { s.x = w + pad; s.baseX = s.x }
        if (s.x > w + pad) { s.x = -pad; s.baseX = s.x }
        if (s.y < -pad) { s.y = h + pad; s.baseY = s.y }
        if (s.y > h + pad) { s.y = -pad; s.baseY = s.y }
      }

      // ── Draw connections between nearby shapes ──
      if (!isReduced) {
        for (let i = 0; i < shapes.length; i++) {
          for (let j = i + 1; j < shapes.length; j++) {
            const a = shapes[i]
            const b = shapes[j]
            const dx = a.x - b.x
            const dy = a.y - b.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < CONNECTION_DISTANCE) {
              const alpha = (1 - dist / CONNECTION_DISTANCE) * CONNECTION_OPACITY
              // Blend colors of connected shapes
              const mr = (a.color.r + b.color.r) / 2
              const mg = (a.color.g + b.color.g) / 2
              const mb = (a.color.b + b.color.b) / 2

              ctx.beginPath()
              ctx.moveTo(a.x, a.y)
              ctx.lineTo(b.x, b.y)
              ctx.strokeStyle = `rgba(${mr}, ${mg}, ${mb}, ${alpha})`
              ctx.lineWidth = 0.6
              ctx.stroke()
            }
          }
        }
      }

      // ── Draw shapes (sorted by depth — background first) ──
      const sortedShapes = [...shapes].sort((a, b) => a.depth - b.depth)

      for (const s of sortedShapes) {
        // Subtle pulse breathing
        const pulse = 1 + Math.sin(timeRef.current * s.pulseSpeed * 60 + s.pulsePhase) * 0.08
        const drawSize = s.size * pulse
        const { r, g, b } = s.color

        // Draw glow halo for larger shapes
        if (s.size > 10 && s.kind !== 'dot') {
          const glowGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, drawSize * 2.5)
          glowGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${s.opacity * 0.12})`)
          glowGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`)
          ctx.beginPath()
          ctx.arc(s.x, s.y, drawSize * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = glowGrad
          ctx.fill()
        }

        // Draw the shape
        DRAW_FNS[s.kind](ctx, s.x, s.y, drawSize, s.rotation, r, g, b, s.opacity)
      }

      // ── Mouse spotlight ──
      if (mouse?.active && !isMobile && !isReduced) {
        const spotGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 300)
        spotGrad.addColorStop(0, 'rgba(45, 212, 191, 0.05)')
        spotGrad.addColorStop(0.2, 'rgba(52, 211, 153, 0.03)')
        spotGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.beginPath()
        ctx.arc(mouse.x, mouse.y, 300, 0, Math.PI * 2)
        ctx.fillStyle = spotGrad
        ctx.fill()
      }

      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    const onResize = () => {
      resize()
      const newW = window.innerWidth
      const newH = window.innerHeight
      shapesRef.current.forEach(s => {
        s.baseX = Math.random() * newW
        s.baseY = Math.random() * newH
        s.x = s.baseX
        s.y = s.baseY
      })
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
      window.removeEventListener('resize', onResize)
      mql.removeEventListener('change', handleMotionChange)
    }
  }, [canvasRef, mouseRef])
}

// ─── Orb configuration ──────────────────────────────────────────────────────

const ORBS = [
  {
    size: 220,
    gradient: 'radial-gradient(circle, rgba(52,211,153,0.12) 0%, rgba(45,212,191,0.06) 50%, transparent 70%)',
    x: '12%', y: '18%', duration: 22,
  },
  {
    size: 180,
    gradient: 'radial-gradient(circle, rgba(251,191,36,0.10) 0%, rgba(245,158,11,0.05) 50%, transparent 70%)',
    x: '75%', y: '15%', duration: 26,
  },
  {
    size: 280,
    gradient: 'radial-gradient(circle, rgba(45,212,191,0.08) 0%, rgba(52,211,153,0.04) 50%, transparent 70%)',
    x: '60%', y: '65%', duration: 30,
  },
  {
    size: 140,
    gradient: 'radial-gradient(circle, rgba(209,213,219,0.09) 0%, rgba(167,139,250,0.04) 50%, transparent 70%)',
    x: '25%', y: '72%', duration: 18,
  },
  {
    size: 160,
    gradient: 'radial-gradient(circle, rgba(245,158,11,0.07) 0%, rgba(251,191,36,0.03) 50%, transparent 70%)',
    x: '88%', y: '50%', duration: 24,
  },
]

// ─── Main Component ─────────────────────────────────────────────────────────

export function CinematicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: 0, y: 0, active: false })
  const [isMounted, setIsMounted] = useState(false)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const smoothX = useSpring(mouseX, { stiffness: 50, damping: 30, mass: 1 })
  const smoothY = useSpring(mouseY, { stiffness: 50, damping: 30, mass: 1 })

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current.x = e.clientX
    mouseRef.current.y = e.clientY
    mouseRef.current.active = true
    mouseX.set(e.clientX)
    mouseY.set(e.clientY)
  }, [mouseX, mouseY])

  const handleMouseLeave = useCallback(() => {
    mouseRef.current.active = false
  }, [])

  useEffect(() => {
    setIsMounted(true)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [handleMouseMove, handleMouseLeave])

  useGeometricCanvas(canvasRef, mouseRef)

  if (!isMounted) return null

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      {/* ── Layer 0: Deep Charcoal Base ── */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: 'oklch(0.10 0.01 260)' }}
      />

      {/* ── Layer 1: Animated Mesh Gradients ── */}
      <div className="absolute inset-0 cinematic-mesh-container">
        <div className="cinematic-mesh cinematic-mesh--emerald" />
        <div className="cinematic-mesh cinematic-mesh--teal" />
        <div className="cinematic-mesh cinematic-mesh--amber" />
        <div className="cinematic-mesh cinematic-mesh--silver" />
      </div>

      {/* ── Layer 2: Geometric Shape Canvas ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ pointerEvents: 'none' }}
      />

      {/* ── Layer 3: Floating Glassmorphism Orbs ── */}
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.gradient,
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            border: '1px solid rgba(255, 255, 255, 0.03)',
            x: smoothX.get() ? undefined : 0,
            y: smoothY.get() ? undefined : 0,
            translateX: '-50%',
            translateY: '-50%',
          }}
          animate={{
            y: [0, -20 - i * 5, 10 + i * 3, 0],
            x: [0, 10 + i * 3, -8 - i * 2, 0],
            scale: [1, 1.04, 0.97, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            times: [0, 0.33, 0.66, 1],
          }}
        />
      ))}

      {/* ── Layer 4: Grain / Noise Texture Overlay ── */}
      <div className="cinematic-grain" />
    </div>
  )
}
