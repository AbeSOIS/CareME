import type { ComponentType, ReactNode } from 'react'
import { cn } from './cn'

/**
 * A single headline figure on the public site (counsellors, districts, languages).
 * Distinct from KpiTile, which is the denser, linkable staff-portal version.
 */
export function StatCard({
  value,
  label,
  caption,
  icon: Icon,
  className,
}: {
  value: ReactNode
  label: ReactNode
  caption?: ReactNode
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl bg-brand-50 p-5 dark:bg-slate-800', className)}>
      {Icon && (
        <span className="mb-3 inline-flex size-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/60">
          <Icon aria-hidden className="size-5 text-brand-700 dark:text-brand-200" />
        </span>
      )}
      <p className="text-3xl font-bold tabular-nums text-brand-900 dark:text-white">{value}</p>
      <p className="mt-1 text-body-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
      {caption && <p className="mt-1 text-caption text-slate-600 dark:text-slate-300">{caption}</p>}
    </div>
  )
}
