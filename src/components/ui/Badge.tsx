import type { ReactNode } from 'react'
import { cn } from './cn'

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

const TONE: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200 dark:bg-brand-950 dark:text-brand-200 dark:ring-brand-800',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800',
  warning: 'bg-amber-50 text-amber-900 ring-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-700',
  danger: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-800',
  info: 'bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-800',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset', TONE[tone], className)}>
      {children}
    </span>
  )
}
