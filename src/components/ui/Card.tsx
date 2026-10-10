import type { ComponentType, ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { cn } from './cn'

/**
 * The card surface, as a string, for the places that cannot use <Card>: react-router
 * <Link> cards and the like. Keep <Card> below in step with this.
 */
export const cardSurface = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900'

/** Interactive variant: the whole card is a link, so it gets a hover affordance. */
export const cardSurfaceLink = `${cardSurface} transition-colors duration-150 hover:border-brand-400 dark:hover:border-brand-400`

/*
 * Padding is 16px on mobile and 20px from `sm` up. The three ministry forms
 * bleed their sticky save bar to the card edge with a matching negative margin
 * (`-mx-4 px-4 sm:-mx-5 sm:px-5`), so these two values must stay in step.
 */
export function Card({ children, className, as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'li' }) {
  return <Tag className={cn(cardSurface, 'p-4 sm:p-5', className)}>{children}</Tag>
}

export function PageHeader({ title, lead, actions }: { title: ReactNode; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0 max-w-prose">
        <h1 className="text-h1 text-slate-900 dark:text-white">{title}</h1>
        {lead && <div className="mt-2 text-body text-slate-600 dark:text-slate-300">{lead}</div>}
      </div>
      {/* Actions keep their natural width (shrink-0) so buttons never squeeze or wrap;
          the title block shrinks instead, and below lg the actions drop onto their own row. */}
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/* Every tone carries an icon as well as a colour — colour is never the only signal. */
const CALLOUT = {
  info: { icon: Info, cls: 'border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-100' },
  success: { icon: CircleCheck, cls: 'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100' },
  warning: { icon: TriangleAlert, cls: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100' },
  danger: { icon: CircleAlert, cls: 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100' },
} as const

export function Callout({
  tone = 'info',
  title,
  children,
  className,
  role,
}: {
  tone?: keyof typeof CALLOUT
  title?: ReactNode
  children?: ReactNode
  className?: string
  role?: 'status' | 'alert'
}) {
  const { icon: Icon, cls } = CALLOUT[tone]
  return (
    <div role={role} className={cn('flex gap-3 rounded-xl border p-4', cls, className)}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 space-y-1">
        {title && <p className="text-body font-semibold">{title}</p>}
        {children && <div className="text-body">{children}</div>}
      </div>
    </div>
  )
}

/** A dead end should still say what to do next, so `icon` and `action` are optional. */
export function EmptyState({
  children,
  icon: Icon,
  action,
}: {
  children: ReactNode
  icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-600">
      {Icon && (
        <span className="mx-auto mb-3 inline-flex size-12 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/60">
          <Icon aria-hidden className="size-6 text-brand-700 dark:text-brand-200" />
        </span>
      )}
      <p className="text-body text-slate-600 dark:text-slate-300">{children}</p>
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  )
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-body text-slate-600 dark:text-slate-300">
      <span className="size-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent dark:border-brand-400 dark:border-t-transparent" aria-hidden />
      {label}
    </div>
  )
}

/** Section heading inside a page, one step down from PageHeader. */
export function SectionHeader({ title, lead, actions, id }: { title: ReactNode; lead?: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-prose">
        <h2 id={id} className="text-h2 text-slate-900 dark:text-white">
          {title}
        </h2>
        {lead && <p className="mt-1 text-body text-slate-600 dark:text-slate-300">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** Placeholder block for loading states. Decorative, so it is hidden from assistive tech. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn('block animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700', className)} />
}
