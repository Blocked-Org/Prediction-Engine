'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register GSAP plugins
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

// ─── Marquee Bar Component ─────────────────────────────────────────────────

interface MarqueeBarProps {
  items: string[]
  direction?: 'left' | 'right'
  speed?: number
}

export function MarqueeBar({ items, direction = 'left', speed = 60 }: MarqueeBarProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const track = trackRef.current
    const container = containerRef.current
    if (!track || !container) return

    // Wait for fonts to load so measurements are correct
    const init = () => {
      // Measure one set of items
      const children = Array.from(track.children) as HTMLElement[]
      const halfCount = children.length / 2
      let totalWidth = 0
      for (let i = 0; i < halfCount; i++) {
        totalWidth += children[i].offsetWidth
      }

      if (totalWidth === 0) return

      const dur = totalWidth / speed

      // Animate seamless loop
      const tween = gsap.to(track, {
        x: direction === 'left' ? -totalWidth : totalWidth,
        duration: dur,
        ease: 'none',
        repeat: -1,
        modifiers: {
          x: gsap.utils.unitize((x: number) => {
            return direction === 'left'
              ? ((parseFloat(String(x)) % totalWidth) + totalWidth) % totalWidth * -1
              : parseFloat(String(x)) % totalWidth
          })
        }
      })

      // ScrollTrigger speed boost
      const st = ScrollTrigger.create({
        trigger: container,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (self) => {
          const velocity = Math.abs(self.getVelocity())
          const speedMultiplier = 1 + Math.min(velocity / 2000, 2)
          tween.timeScale(speedMultiplier)
          gsap.to(tween, { timeScale: 1, duration: 0.8, overwrite: true })
        }
      })

      return () => {
        tween.kill()
        st.kill()
      }
    }

    // Small delay for fonts
    const timeoutId = setTimeout(init, 100)
    return () => clearTimeout(timeoutId)
  }, [items, direction, speed])

  // Duplicate items 4x for seamless loop
  const repeatedItems = [...items, ...items, ...items, ...items]

  return (
    <div ref={containerRef} className="marquee-bar">
      <div
        ref={trackRef}
        className="marquee-bar__track"
        style={{ display: 'inline-flex' }}
      >
        {repeatedItems.map((item, i) => (
          <span key={i} className="marquee-bar__item">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Parallax Text Component ───────────────────────────────────────────────

interface ParallaxTextProps {
  text: string
  className?: string
}

export function ParallaxText({ text, className = '' }: ParallaxTextProps) {
  const textRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = textRef.current
    if (!el) return

    const tween = gsap.to(el, {
      xPercent: -20,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
      }
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [])

  return (
    <div className="overflow-hidden pointer-events-none select-none" aria-hidden="true">
      <div
        ref={textRef}
        className={`parallax-text ${className}`}
        style={{ fontSize: 'clamp(6rem, 18vw, 20rem)', width: '150%' }}
      >
        {text}
      </div>
    </div>
  )
}

// ─── Card Reveal Hook ──────────────────────────────────────────────────────

export function useCardReveal(containerSelector: string, cardSelector: string) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    // Small delay for DOM
    const timeout = setTimeout(() => {
      const container = document.querySelector(containerSelector)
      if (!container) return

      const cards = container.querySelectorAll(cardSelector)
      if (cards.length === 0) return

      gsap.fromTo(
        cards,
        {
          y: 100,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: container,
            start: 'top 80%',
            toggleActions: 'play none none none',
          }
        }
      )
    }, 200)

    return () => clearTimeout(timeout)
  }, [containerSelector, cardSelector])
}

// ─── Footer Reveal Hook ────────────────────────────────────────────────────

export function useFooterReveal(textSelector: string) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const timeout = setTimeout(() => {
      const el = document.querySelector(textSelector)
      if (!el) return

      gsap.fromTo(
        el,
        {
          letterSpacing: '10px',
          scale: 0.8,
          opacity: 0.3,
        },
        {
          letterSpacing: '-5px',
          scale: 1,
          opacity: 1,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 90%',
            end: 'top 40%',
            scrub: 1,
          }
        }
      )
    }, 200)

    return () => clearTimeout(timeout)
  }, [textSelector])
}

// ─── Section Reveal Hook (generic fade-in-up for sections) ─────────────────

export function useSectionReveal(selector: string) {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const timeout = setTimeout(() => {
      const elements = document.querySelectorAll(selector)
      if (elements.length === 0) return

      elements.forEach((el) => {
        gsap.fromTo(
          el,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: el,
              start: 'top 85%',
              toggleActions: 'play none none none',
            }
          }
        )
      })
    }, 200)

    return () => clearTimeout(timeout)
  }, [selector])
}
