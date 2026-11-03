import { useEffect, useRef, useState } from 'react'
import { Wind } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, cardSurface, cn } from '../ui'

type Phase = 'idle' | 'in' | 'out'

const PHASE_MS = 4000

/**
 * A short, self-paced breathing exercise: a circle grows on a 4-second inhale and
 * shrinks on a 4-second exhale, with the phase also spelled out in text (useful on its
 * own, and the only cue left for prefers-reduced-motion users — the circle's own CSS
 * transition is collapsed by the app-wide reduced-motion rule in index.css, but the
 * text swap below still paces them through the exercise).
 */
export function BreathingExercise() {
  const { t } = useTranslation()
  const [phase, setPhase] = useState<Phase>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const scheduleNext = (next: Phase) => {
    timerRef.current = setTimeout(() => {
      setPhase(next)
      scheduleNext(next === 'in' ? 'out' : 'in')
    }, PHASE_MS)
  }

  const start = () => {
    setPhase('in')
    scheduleNext('out')
  }

  const stop = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setPhase('idle')
  }

  const label = phase === 'in' ? t('breathe.inhale') : phase === 'out' ? t('breathe.exhale') : t('breathe.ready')
  const caption = phase === 'in' ? t('breathe.inhaleCaption') : phase === 'out' ? t('breathe.exhaleCaption') : t('breathe.disclaimer')

  return (
    <section aria-labelledby="breathe" className={cn(cardSurface, 'grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:items-center')}>
      <div>
        <p className="flex items-center gap-3 text-caption font-extrabold tracking-[0.2em] text-brand-600 uppercase dark:text-brand-300">
          <Wind aria-hidden className="size-4" />
          {t('breathe.kicker')}
        </p>
        <h2 id="breathe" className="mt-3 text-h1 text-slate-900 dark:text-white">
          {t('breathe.title')}
        </h2>
        <p className="mt-3 max-w-prose text-body text-slate-600 dark:text-slate-300">{t('breathe.lead')}</p>
        <Button className="mt-6" size="lg" onClick={phase === 'idle' ? start : stop} aria-pressed={phase !== 'idle'}>
          {phase === 'idle' ? t('breathe.start') : t('breathe.stop')}
        </Button>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 py-4">
        <div className="relative grid size-48 place-items-center">
          <div
            aria-hidden
            className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-200 to-brand-400 transition-transform duration-[4000ms] ease-in-out dark:from-brand-700 dark:to-brand-500"
            style={{ transform: `scale(${phase === 'in' ? 1 : phase === 'out' ? 0.62 : 0.8})` }}
          />
          <output aria-live="polite" className="relative text-h3 font-semibold text-brand-950 dark:text-white">
            {label}
          </output>
        </div>
        <p className="min-h-6 text-center text-caption text-slate-500 dark:text-slate-400">{caption}</p>
      </div>
    </section>
  )
}
