import { useMemo, useRef } from 'react'
import type { PointerEvent } from 'react'

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Pointer-driven 3D tilt for a card: rotates toward the cursor and lifts on
 * hover, snapping back on leave. A no-op under prefers-reduced-motion, so it
 * never fights the app-wide reduced-motion rule in index.css.
 */
export function useTilt3D(maxDeg = 10) {
  const ref = useRef<HTMLElement | null>(null)

  const handlers = useMemo(
    () => ({
      onPointerMove: (e: PointerEvent<HTMLElement>) => {
        const el = ref.current
        if (!el || e.pointerType === 'touch' || prefersReducedMotion()) return
        const rect = el.getBoundingClientRect()
        const px = (e.clientX - rect.left) / rect.width - 0.5
        const py = (e.clientY - rect.top) / rect.height - 0.5
        el.style.setProperty('--tilt-x', `${(-py * maxDeg).toFixed(2)}deg`)
        el.style.setProperty('--tilt-y', `${(px * maxDeg).toFixed(2)}deg`)
        el.style.setProperty('--tilt-glare-x', `${(px + 0.5) * 100}%`)
        el.style.setProperty('--tilt-glare-y', `${(py + 0.5) * 100}%`)
      },
      onPointerLeave: () => {
        const el = ref.current
        if (!el) return
        el.style.setProperty('--tilt-x', '0deg')
        el.style.setProperty('--tilt-y', '0deg')
      },
    }),
    [maxDeg],
  )

  return { ref, handlers }
}
