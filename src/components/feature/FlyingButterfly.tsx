import { useEffect, useRef } from 'react'

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Tone = 'navy' | 'mid' | 'pale'

const TONES: Record<Tone, { wing: string; band: string; spot: string; spot2: string }> = {
  navy: { wing: 'var(--color-brand-900)', band: 'var(--color-brand-500)', spot: 'var(--color-brand-200)', spot2: 'var(--color-brand-300)' },
  mid: { wing: 'var(--color-brand-700)', band: 'var(--color-brand-400)', spot: 'var(--color-brand-100)', spot2: 'var(--color-brand-200)' },
  pale: { wing: 'var(--color-brand-600)', band: 'var(--color-brand-300)', spot: 'var(--color-brand-50)', spot2: 'var(--color-brand-200)' },
}

/**
 * A stylised version of the butterfly at the centre of the CareMe logo (public/careme-logo.png),
 * redrawn as flat brand-colour wings rather than cropped from the badge artwork, so it stays crisp
 * at any size and recolours with the theme. Two wing pairs + antennae, nothing else. `tone` picks
 * one of three brand-palette colourways so a group of these reads as a little variety, not clones.
 */
function ButterflySvg({ className, tone = 'navy' }: { className?: string; tone?: Tone }) {
  const c = TONES[tone]
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <g className="wing-left">
        <path d="M60,45 C40,18 8,12 5,38 C3,58 34,66 60,50 Z" fill={c.wing} />
        <path d="M60,50 C44,54 23,68 27,86 C31,97 50,89 60,66 Z" fill={c.band} />
        <ellipse cx="28" cy="36" rx="7" ry="5" fill={c.spot} opacity="0.85" />
        <ellipse cx="42" cy="68" rx="4" ry="3" fill={c.spot2} opacity="0.85" />
      </g>
      <g className="wing-right">
        <path d="M60,45 C80,18 112,12 115,38 C117,58 86,66 60,50 Z" fill={c.wing} />
        <path d="M60,50 C76,54 97,68 93,86 C89,97 70,89 60,66 Z" fill={c.band} />
        <ellipse cx="92" cy="36" rx="7" ry="5" fill={c.spot} opacity="0.85" />
        <ellipse cx="78" cy="68" rx="4" ry="3" fill={c.spot2} opacity="0.85" />
      </g>
      <path d="M57,30 C54,22 49,18 45,20" fill="none" stroke={c.wing} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M63,30 C66,22 71,18 75,20" fill="none" stroke={c.wing} strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="60" cy="52" rx="3.2" ry="21" fill="var(--color-brand-950)" />
      <circle cx="60" cy="31" r="4" fill="var(--color-brand-950)" />
    </svg>
  )
}

type FlightConfig = {
  tone: Tone
  size: string
  xFrac: number
  yFrac: number
  phase: number
  driftSpeed: number
  swoopSign: number
  parkX: string
  parkY: string
}

// A small swarm rather than one lone butterfly: different starting corners, speeds and
// phases so they drift apart instead of moving in lockstep, plus a size/tone per butterfly
// for a little visual variety.
const SWARM: FlightConfig[] = [
  { tone: 'navy', size: 'size-14 sm:size-16', xFrac: 0.72, yFrac: 0.3, phase: 0, driftSpeed: 1, swoopSign: 1, parkX: '78vw', parkY: '22vh' },
  { tone: 'mid', size: 'size-10 sm:size-12', xFrac: 0.2, yFrac: 0.55, phase: 2.1, driftSpeed: 1.3, swoopSign: -1, parkX: '14vw', parkY: '48vh' },
  { tone: 'pale', size: 'size-9 sm:size-11', xFrac: 0.45, yFrac: 0.75, phase: 4.4, driftSpeed: 0.8, swoopSign: 1, parkX: '55vw', parkY: '70vh' },
]

/**
 * The butterflies fly through the whole page: fixed to the viewport, behind opaque card
 * backgrounds (-z-10, same layering the old decorative scene used) but visible over the
 * page background and translucent panels. Idle wandering plus a scroll-reactive "swoop" —
 * scrolling faster nudges each one further, decaying back to its lazy drift — so they read
 * as something that travels with you down the page rather than fixed hero stickers.
 *
 * Under prefers-reduced-motion they render once, parked at a few spots, with no JS-driven
 * motion at all (the wing-flutter CSS animation is already collapsed by the app-wide
 * reduced-motion rule in index.css).
 */
export function FlyingButterfly() {
  const refs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (prefersReducedMotion()) return

    let raf = 0
    let disposed = false
    let visible = !document.hidden
    const onVisibility = () => (visible = !document.hidden)
    document.addEventListener('visibilitychange', onVisibility)

    const w0 = window.innerWidth
    const h0 = window.innerHeight
    const state = SWARM.map((cfg) => ({ cfg, x: w0 * cfg.xFrac, y: h0 * cfg.yFrac, vx: 0, vy: 0 }))
    let lastScrollY = window.scrollY

    const start = performance.now()
    const animate = () => {
      if (disposed) return
      raf = requestAnimationFrame(animate)
      if (!visible) return

      const t = (performance.now() - start) / 1000
      const scrollY = window.scrollY
      const scrollDelta = scrollY - lastScrollY
      lastScrollY = scrollY
      const w = window.innerWidth
      const h = window.innerHeight

      state.forEach((s, i) => {
        const el = refs.current[i]
        if (!el) return
        const { cfg } = s
        const tt = t * cfg.driftSpeed + cfg.phase

        const targetX = w * (0.5 + 0.35 * Math.sin(tt * 0.15))
        const targetY = h * (0.45 + 0.3 * Math.sin(tt * 0.22 + 1.3))

        const kickX = w * 0.18 * cfg.swoopSign * Math.sign(Math.sin(tt * 0.3))
        const kickY = Math.max(-h * 0.3, Math.min(h * 0.3, scrollDelta * (1.4 + i * 0.4)))

        s.vx += (targetX + kickX - s.x) * 0.002 - s.vx * 0.08
        s.vy += (targetY + kickY - s.y) * 0.002 - s.vy * 0.08
        s.x = Math.max(40, Math.min(w - 40, s.x + s.vx))
        s.y = Math.max(40, Math.min(h - 40, s.y + s.vy))

        const flip = s.vx < 0 ? -1 : 1
        const bank = Math.max(-25, Math.min(25, s.vy * 1.4)) * flip
        // A slow depth bob (nearer/further from the "camera") on top of the flight path,
        // so each one reads as flying through the page rather than sliding across a flat plane.
        const depth = 0.8 + 0.3 * (Math.sin(tt * 0.45) + 1) * 0.5
        el.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${bank}deg) scale(${flip * depth}, ${depth})`
      })
    }
    animate()

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(raf)
    }
  }, [])

  const reduced = prefersReducedMotion()

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {SWARM.map((cfg, i) => (
        <div
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          className={`absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 ${cfg.size}`}
          style={reduced ? { transform: `translate(${cfg.parkX}, ${cfg.parkY})` } : undefined}
        >
          <ButterflySvg tone={cfg.tone} className="size-full drop-shadow-[0_6px_10px_rgba(29,57,107,0.25)]" />
        </div>
      ))}
    </div>
  )
}
