import { HeartHandshake } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function Brand({ to = '/', subtitle, compactOnMobile }: { to?: string; subtitle?: string; compactOnMobile?: boolean }) {
  const { t } = useTranslation()
  return (
    <Link to={to} className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg pr-2">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-700 text-white dark:bg-brand-500 dark:text-slate-950">
        <HeartHandshake aria-hidden className="size-5" />
      </span>
      <span className={compactOnMobile ? 'min-w-0 leading-tight max-sm:sr-only' : 'min-w-0 leading-tight'}>
        <span className="block text-lg font-bold text-brand-900 dark:text-white">{t('app.name')}</span>
        {subtitle && <span className="block truncate text-xs text-slate-600 dark:text-slate-400">{subtitle}</span>}
      </span>
    </Link>
  )
}
