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
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
        {Icon && <Icon aria-hidden className={cn('size-5', tone === 'alert' ? 'text-red-600' : 'text-brand-700 dark:text-brand-300')} />}
      </div>
      <p className={cn('mt-2 text-3xl font-bold tabular-nums', tone === 'alert' && 'text-red-700 dark:text-red-400')}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </>
  )
  const cls = cn(
    'block rounded-2xl border bg-white p-4 dark:bg-slate-900',
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
