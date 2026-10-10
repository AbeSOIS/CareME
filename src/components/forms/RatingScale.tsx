import { useTranslation } from 'react-i18next'
import { pick } from '../../i18n'
import type { Choice, ScaleItem } from '../../config/forms'
import type { LanguageCode } from '../../types'
import { cn } from '../ui'

export interface RatingScaleProps {
  items: ScaleItem[]
  options: Choice[]
  value: Record<string, string>
  onChange: (itemId: string, optionValue: string) => void
  /** Accessible name for the whole grid. */
  label: string
  disabled?: boolean
  name: string
}

/**
 * Likert grid used by Form B (sections E/F) and the Assessment Form (section ඉ).
 * Each row is a radiogroup of native radios: arrow keys move between options and
 * screen readers announce the item as the group label. Column headers on md+,
 * inline option labels on small screens.
 */
export function RatingScale({ items, options, value, onChange, label, disabled, name }: RatingScaleProps) {
  const { i18n } = useTranslation()
  const lang = i18n.language as LanguageCode
  // Ministry scales are all 4-point; a static class lets Tailwind generate it.
  const cols = 'md:grid-cols-[minmax(0,1fr)_repeat(4,6.5rem)]'
  return (
    <div role="group" aria-label={label} className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
      <div aria-hidden className={cn('hidden gap-2 bg-slate-50 px-3 py-2 text-caption font-semibold text-slate-700 md:grid dark:bg-slate-800 dark:text-slate-200', cols)}>
        <span />
        {options.map((o) => (
          <span key={o.value} className="text-center">
            {pick(o.label, lang)}
          </span>
        ))}
      </div>
      {items.map((item, idx) => (
        // role="radiogroup" instead of fieldset/legend: legends cannot take part in CSS grid rows.
        <div
          key={item.id}
          role="radiogroup"
          aria-labelledby={`${name}-${item.id}-label`}
          aria-disabled={disabled || undefined}
          className={cn('grid gap-2 px-3 py-3 md:items-center', cols, idx % 2 ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-900/60')}
        >
          <span id={`${name}-${item.id}-label`} className="font-medium md:pr-2">
            {pick(item.label, lang)}
          </span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:contents">
            {options.map((o) => {
              const checked = value[item.id] === o.value
              return (
                <label
                  key={o.value}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border px-2 text-body-sm md:border-transparent',
                    checked ? 'border-brand-600 bg-brand-50 dark:bg-brand-950 md:bg-transparent' : 'border-slate-300 dark:border-slate-600',
                  )}
                >
                  <input
                    type="radio"
                    name={`${name}-${item.id}`}
                    value={o.value}
                    checked={checked}
                    onChange={() => onChange(item.id, o.value)}
                    disabled={disabled}
                    className="size-5 accent-brand-700"
                  />
                  <span className="md:sr-only">{pick(o.label, lang)}</span>
                </label>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Sum of 0–3 scores for a set of answers (Not at all = 0 … Often/Always = 3). */
export function scaleTotal(values: Record<string, string>, options: Choice[]): number {
  return Object.values(values).reduce((sum, v) => {
    const idx = options.findIndex((o) => o.value === v)
    return sum + (idx < 0 ? 0 : idx)
  }, 0)
}
