import type { ReactNode } from 'react'
import { cn } from './cn'

export type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info'

const TONE: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-600',
  brand: 'bg-brand-50 text-brand-800 ring-brand-200 dark:bg-brand-950 dark:text-brand-200 dark:ring-brand-800',
  success: 'bg-green-50 text-green-800 ring-green-200 dark:bg-green-950 dark:text-green-200 dark:ring-green-800',
  warning: 'bg-amber-50 text-amber-900 ring-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-700',
  danger: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-950 dark:text-red-200 dark:ring-red-800',
  // Info is brand blue, not sky — sky would read as a second, competing brand.
  info: 'bg-brand-100 text-brand-900 ring-brand-300 dark:bg-brand-900/50 dark:text-brand-100 dark:ring-brand-700',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex w-fit max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-caption font-semibold ring-1 ring-inset', TONE[tone], className)}>
      {children}
    </span>
  )
}
