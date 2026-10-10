import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export const SERIES = Array.from({ length: 8 }, (_, i) => `var(--series-${i + 1})`)

export interface TableColumn {
  key: string
  label: string
}

/** Titled chart card with a toggleable data table (identity is never colour-alone). */
export function ChartFrame({ title, children, columns, rows }: { title: string; children: ReactNode; columns: TableColumn[]; rows: Array<Record<string, string | number>> }) {
  const { t } = useTranslation()
  const [showTable, setShowTable] = useState(false)
  const id = useId()
  return (
    <figure className="rounded-2xl border border-slate-200 bg-[var(--chart-surface)] p-4 dark:border-slate-700" aria-labelledby={id}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <figcaption id={id} className="font-semibold">
          {title}
        </figcaption>
        <button type="button" aria-pressed={showTable} onClick={() => setShowTable((s) => !s)} className="min-h-8 rounded-md px-2 text-body-sm font-medium text-brand-800 hover:bg-brand-50 dark:text-brand-200 dark:hover:bg-slate-800">
          {t('dashboard.chartTable')}
        </button>
      </div>
      {showTable ? (
        <div className="scrollbar-thin relative max-h-80 overflow-auto">
          <table className="w-full text-body-sm">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className="border-b border-slate-200 px-2 py-1 text-left font-semibold dark:border-slate-700">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                  {columns.map((c) => (
                    <td key={c.key} className="px-2 py-1 tabular-nums">
                      {r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div aria-hidden="true">{children}</div>
      )}
    </figure>
  )
}

export const axisProps = {
  stroke: 'var(--chart-grid)',
  tick: { fill: 'var(--chart-text)', fontSize: 12 },
  tickLine: false,
}

export const tooltipProps = {
  contentStyle: { background: 'var(--chart-surface)', border: '1px solid var(--chart-grid)', borderRadius: 8, color: 'var(--chart-text)' },
  labelStyle: { color: 'var(--chart-text)', fontWeight: 600 },
  cursor: { fill: 'var(--chart-grid)', fillOpacity: 0.35 },
}

/** Legend labels wear the text colour; the coloured swatch carries series identity. */
export const legendProps = {
  wrapperStyle: { fontSize: 12 },
  formatter: (value: string) => <span style={{ color: 'var(--chart-text)' }}>{value}</span>,
}
