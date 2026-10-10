import { Check } from 'lucide-react'
import { cn } from './cn'

/**
 * Progress through a multi-step flow (booking, registration).
 * `label` names the list for assistive tech; `steps` are already-translated titles.
 * The current step is marked with aria-current, and completed steps carry a tick
 * as well as a colour, so progress is never signalled by colour alone.
 */
export function Stepper({ steps, current, label, className }: { steps: string[]; current: number; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {steps.map((step, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={step} className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-caption font-bold',
                  done && 'bg-brand-700 text-white dark:bg-brand-400 dark:text-slate-950',
                  active && 'bg-brand-100 text-brand-900 ring-2 ring-brand-700 dark:bg-brand-900 dark:text-brand-50 dark:ring-brand-400',
                  !done && !active && 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                )}
              >
                {done ? <Check aria-hidden className="size-4" /> : i + 1}
              </span>
              <span
                aria-current={active ? 'step' : undefined}
                className={cn('text-body-sm', active ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300')}
              >
                {step}
              </span>
              {i < steps.length - 1 && <span aria-hidden className="ms-1 hidden h-px w-6 bg-slate-300 sm:block dark:bg-slate-600" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
