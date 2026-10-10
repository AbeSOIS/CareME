import { Siren } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

/** Always-visible emergency entry point on every beneficiary screen (FR-051). */
export function EmergencyButton() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  if (pathname === '/emergency') return null
  return (
    <Link
      to="/emergency"
      aria-label={t('emergency.buttonLabel')}
      className="fixed right-4 bottom-4 z-40 inline-flex min-h-13 items-center gap-2 rounded-full bg-red-600 px-5 text-body font-bold text-white shadow-xl ring-4 ring-white transition-colors duration-150 hover:bg-red-700 focus-visible:outline-red-700 sm:right-6 sm:bottom-6 dark:ring-slate-950"
    >
      <Siren aria-hidden className="size-5" />
      <span>{t('emergency.button')}</span>
    </Link>
  )
}
