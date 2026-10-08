import type { ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react'
import { cn } from './cn'

export function Card({ children, className, as: Tag = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' | 'li' }) {
  return <Tag className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900', className)}>{children}</Tag>
}

export function PageHeader({ title, lead, actions }: { title: ReactNode; lead?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{title}</h1>
        {lead && <p className="mt-2 text-slate-600 dark:text-slate-300">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

const CALLOUT = {
  info: { icon: Info, cls: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-100' },
  success: { icon: CircleCheck, cls: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100' },
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
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-sm leading-relaxed">{children}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-600 dark:border-slate-600 dark:text-slate-400">{children}</p>
}

export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-slate-600 dark:text-slate-400">
      <span className="size-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" aria-hidden />
      {label}
    </div>
  )
}
