import { Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { EMERGENCY_NUMBERS } from '../../config/defaults'
import { cn } from '../ui'

/** Emergency numbers block, shown wherever a beneficiary might be stuck (pre-bid fallback rule, FR-086). */
export function EmergencyInfo({ compact, className }: { compact?: boolean; className?: string }) {
  const { t } = useTranslation()
  return (
    <section aria-label={t('emergency.title')} className={cn('rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/60', className)}>
      {!compact && <p className="mb-3 text-body font-semibold text-red-900 dark:text-red-100">{t('emergency.lead')}</p>}
      <ul className={cn('grid gap-2', compact ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-3')}>
        {EMERGENCY_NUMBERS.map((n) => (
          <li key={n.key}>
            <a
              href={`tel:${n.number}`}
              className="flex min-h-13 items-center gap-3 rounded-xl bg-white px-3 py-2 text-red-900 ring-1 ring-red-200 transition-colors duration-150 hover:bg-red-100 dark:bg-slate-900 dark:text-red-100 dark:ring-red-900 dark:hover:bg-slate-800"
            >
              <Phone aria-hidden className="size-5 shrink-0" />
              <span>
                <span className="block text-h2">{n.number}</span>
                <span className="block text-caption">{t(`emergency.numbers.${n.key}`)}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-caption text-red-800 dark:text-red-300">{t('emergency.confirmNumbers')}</p>
    </section>
  )
}
