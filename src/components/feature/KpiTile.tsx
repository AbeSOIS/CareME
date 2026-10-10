import type { ComponentType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../ui'

interface KpiTileProps {
  label: string
  value: ReactNode
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  to?: string
  tone?: 'default' | 'alert'
  hint?: ReactNode
}

export function KpiTile({ label, value, icon: Icon, to, tone = 'default', hint }: KpiTileProps) {
  const body = (
    <>
      {/* items-start so the icon lines up with the first line of a two-line label.
          The label reserves two lines' height so every value in a row sits on the
          same line, however long or short the neighbouring labels are. */}
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 min-h-[2.9em] min-w-0 text-body-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
        {Icon && <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', tone === 'alert' ? 'text-red-600' : 'text-brand-700 dark:text-brand-300')} />}
      </div>
      <p className={cn('mt-2 text-3xl font-bold tabular-nums', tone === 'alert' && 'text-red-700 dark:text-red-400')}>{value}</p>
      {hint && <p className="mt-1 text-caption text-slate-600 dark:text-slate-300">{hint}</p>}
    </>
  )
  const cls = cn(
    'flex h-full flex-col rounded-2xl border bg-white p-4 dark:bg-slate-900',
    tone === 'alert' ? 'border-red-200 dark:border-red-900' : 'border-slate-200 dark:border-slate-700',
    to && 'transition-shadow hover:shadow-md',
  )
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
