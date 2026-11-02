import { useEffect, useRef } from 'react'

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Tone = 'navy' | 'mid' | 'pale'

// Three shades of the same wing-blue so a group of these reads as a little variety, not
// clones — the dark trim, white dots and rainbow accent (matching the reference image)
// stay constant across all three, since that's the recognisable part of the mark.
const WING_FILL: Record<Tone, string> = {
  navy: 'var(--color-brand-400)',
  mid: 'var(--color-brand-300)',
  pale: 'var(--color-brand-200)',
}

/**
 * One mirrored wing (upper lobe + lower lobe with a tail streamer), reflected for the other
 * side. The mirror lives on this outer, unanimated group; the flap animation goes on the
 * inner group instead, because a CSS animation's transform replaces (rather than combines
 * with) an SVG `transform` attribute on the same element — putting both on one <g> would
 * silently drop the mirroring every time the wing flapped.
 */
function Wing({ fill, mirror, className }: { fill: string; mirror?: boolean; className?: string }) {
  return (
    <g transform={mirror ? 'translate(120,0) scale(-1,1)' : undefined}>
      <g className={className}>
        {/* upper (fore) wing: dark trim, pale field, white dot row, rainbow accent near the body */}
        <path d="M60,40 C46,16 16,6 6,20 C-2,32 6,46 24,47 C38,48 52,45 60,40 Z" fill="var(--color-brand-950)" />
        <path d="M58,37 C47,20 23,13 14,23 C8,31 13,40 26,41 C37,42 50,40 58,37 Z" fill={fill} />
        <circle cx="10" cy="22" r="1.6" fill="white" />
        <circle cx="7" cy="28" r="1.6" fill="white" />
        <circle cx="11" cy="36" r="1.6" fill="white" />
        <circle cx="20" cy="42" r="1.6" fill="white" />
        <g transform="translate(34,26) rotate(12)">
          <ellipse rx="6.5" ry="3.4" fill="white" />
          <path d="M-5,-2.4 A5.6,2.9 0 0 1 5,-2.4 L4,-0.3 L-4,-0.3 Z" fill="#f4c430" />
          <path d="M-4.3,-0.3 L4.3,-0.3 L3.6,1.1 L-3.6,1.1 Z" fill="#c23b3b" />
          <path d="M-3.4,1.1 A4.6,2.1 0 0 0 3.4,1.1 L2.6,2.6 L-2.6,2.6 Z" fill="#e8823c" />
        </g>
        {/* lower (hind) wing: scalloped dark trim, a teal inner band, one thin tail streamer */}
        <path d="M60,44 C49,50 24,53 13,68 C4,81 10,95 22,92 C27,91 27,83 25,78 C33,90 29,102 22,109 C26,108 33,100 36,90 C40,96 48,93 60,76 Z" fill="var(--color-brand-950)" />
        <path d="M59,46 C50,51 29,54 20,67 C13,77 18,88 27,85 C33,83 34,74 33,68 C40,78 48,78 58,65 Z" fill={fill} opacity="0.92" />
        <circle cx="16" cy="66" r="1.5" fill="white" />
        <circle cx="12" cy="76" r="1.5" fill="white" />
        <circle cx="17" cy="86" r="1.5" fill="white" />
      </g>
    </g>
  )
}

/**
 * A faithful redraw of the butterfly supplied for this feature (swallowtail wings, navy
 * scalloped trim with white dots, a small rainbow accent near the body, tail streamers,
 * and the little raised-arms "person" figure as the body), as flat SVG rather than the
 * source JPEG — a photo with a solid white background wouldn't composite over the site's
 * light, dark and translucent surfaces, where an SVG just recolours and stays crisp.
 */
function ButterflySvg({ className, tone = 'navy' }: { className?: string; tone?: Tone }) {
  const fill = WING_FILL[tone]
  return (
    <svg viewBox="0 0 120 112" className={className} aria-hidden>
      <Wing fill={fill} className="wing-left" />
      <Wing fill={fill} mirror className="wing-right" />
      {/* the mascot body: a small figure with raised arms, standing in for an insect body */}
      <path d="M60,26 C57,46 56,78 60,100 C64,78 63,46 60,26 Z" fill="var(--color-brand-700)" />
      <circle cx="60" cy="18" r="4.4" fill="var(--color-brand-700)" />
      <path d="M60,24 C55,19 47,15 42,17" fill="none" stroke="var(--color-brand-700)" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M60,24 C65,19 73,15 78,17" fill="none" stroke="var(--color-brand-700)" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="42" cy="17" r="2.2" fill="var(--color-brand-700)" />
      <circle cx="78" cy="17" r="2.2" fill="var(--color-brand-700)" />
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
