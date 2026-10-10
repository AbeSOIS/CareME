import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from './Card'
import { cn } from './cn'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
  /** Shown as the card title on small screens. */
  primary?: boolean
}

interface DataTableProps<T> {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  caption: string
  captionHidden?: boolean
  empty?: ReactNode
}

/** Table on md+ screens; stacked cards on mobile so nothing scrolls sideways. */
export function DataTable<T>({ rows, columns, rowKey, caption, captionHidden = true, empty }: DataTableProps<T>) {
  const { t } = useTranslation()
  if (!rows.length) return <EmptyState>{empty ?? t('common.noResults')}</EmptyState>
  return (
    <>
      <div className="scrollbar-thin hidden relative overflow-x-auto rounded-2xl border border-slate-200 md:block dark:border-slate-700">
        <table className="w-full text-left text-body-sm">
          <caption className={captionHidden ? 'sr-only' : 'p-3 text-left text-body font-semibold'}>{caption}</caption>
          <thead className="bg-slate-50 text-caption text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <tr>
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('px-3 py-3 font-semibold', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-700 dark:bg-slate-900">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="align-top transition-colors duration-150 hover:bg-brand-50 dark:hover:bg-slate-800">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-3 py-3.5', c.className)}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <dl className="space-y-2 text-body-sm">
              {columns.map((c) =>
                c.primary ? (
                  <div key={c.key} className="text-h3 text-slate-900 dark:text-white">
                    {c.render(row)}
                  </div>
                ) : (
                  <div key={c.key} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    <dt className="text-slate-600 dark:text-slate-300">{c.header}</dt>
                    <dd className="text-right">{c.render(row)}</dd>
                  </div>
                ),
              )}
            </dl>
          </li>
        ))}
      </ul>
    </>
  )
}
