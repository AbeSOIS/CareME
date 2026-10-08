import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../../hooks/useFormat'
import type { Slot } from '../../types'
import { cn, EmptyState } from '../ui'

interface Props {
  slots: Slot[]
  value: string | null
  onChange: (slot: Slot) => void
  label: string
}

/** Day strip + time grid. Buttons expose their state with aria-pressed. */
export function SlotPicker({ slots, value, onChange, label }: Props) {
  const { t } = useTranslation()
  const fmt = useFormat()
  const days = useMemo(() => {
    const map = new Map<string, Slot[]>()
    for (const s of slots) {
      const key = s.start.slice(0, 10)
      const local = new Date(s.start).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })
      map.set(local || key, [...(map.get(local || key) ?? []), s])
    }
    return [...map.entries()]
  }, [slots])
  const selectedDay = value ? days.find(([, list]) => list.some((s) => s.id === value))?.[0] : undefined
  const [day, setDay] = useState<string | undefined>(selectedDay ?? days[0]?.[0])
  const current = days.find(([d]) => d === day)?.[1] ?? []

  if (!slots.length) return <EmptyState>{t('booking.noSlots')}</EmptyState>

  return (
    <div role="group" aria-label={label} className="space-y-4">
      <div className="-mx-1 flex gap-2 relative overflow-x-auto px-1 pb-1">
        {days.map(([d, list]) => (
          <button
            key={d}
            type="button"
            aria-pressed={d === day}
            onClick={() => setDay(d)}
            className={cn(
              'min-h-16 min-w-24 shrink-0 rounded-xl border px-3 py-2 text-center text-sm',
              d === day ? 'border-brand-600 bg-brand-700 text-white dark:bg-brand-500 dark:text-slate-950' : 'border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-800',
            )}
          >
            <span className="block font-semibold">{fmt.dayShort(list[0].start)}</span>
            <span className="block text-xs opacity-80">{list.length}</span>
          </button>
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {current.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              aria-pressed={s.id === value}
              onClick={() => onChange(s)}
              className={cn(
                'min-h-11 w-full rounded-lg border px-3 font-semibold',
                s.id === value ? 'border-brand-600 bg-brand-50 text-brand-900 ring-2 ring-brand-600 dark:bg-brand-950 dark:text-brand-100' : 'border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800',
              )}
            >
              {fmt.time(s.start)} <span className="text-xs font-normal">· {t('common.minutes', { count: s.durationMin })}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
