/**
 * Perception & motion hooks — small, GPU-friendly, reduced-motion aware.
 */
import { useEffect, useRef, useState } from 'react'
import { sessionElapsed } from '../lib/session'

/** Seconds elapsed since session start; null until mounted (hydration-safe). */
export function useNow(intervalMs = 1000): number | null {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setNow(sessionElapsed())
    tick()
    const t = window.setInterval(tick, intervalMs)
    return () => window.clearInterval(t)
  }, [intervalMs])
  return now
}

/** True when the user prefers reduced motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return reduced
}

/** Adds `.in` to a ref'd element the first time it enters the viewport. */
export function useReveal<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('in')
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08, ...options },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [options])
  return ref
}

/** Eased count-up used for stat blocks. Returns the display value. */
export function useCountUp(target: number, durationMs = 900, start = true): number {
  const [value, setValue] = useState(0)
  const raf = useRef(0)
  useEffect(() => {
    if (!start) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setValue(target)
      return
    }
    const t0 = performance.now()
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [target, durationMs, start])
  return value
}

/** Tracks window scroll past a threshold (nav elevation, etc.). */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

/** Cursor spotlight coordinates for a card (desktop, fine pointers only). */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!window.matchMedia('(pointer: fine)').matches) return
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--sx', `${e.clientX - r.left}px`)
      el.style.setProperty('--sy', `${e.clientY - r.top}px`)
    }
    el.addEventListener('mousemove', onMove)
    return () => el.removeEventListener('mousemove', onMove)
  }, [])
  return ref
}
