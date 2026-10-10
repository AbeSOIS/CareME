import { ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ButtonLink } from '../../components/ui'

export function ForbiddenPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <span className="mx-auto inline-flex size-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/60">
        <ShieldAlert aria-hidden className="size-10 text-amber-700 dark:text-amber-200" />
      </span>
      <h1 className="mt-6 text-h1">{t('common.forbidden')}</h1>
      <p className="mx-auto mt-2 max-w-prose text-body text-slate-600 dark:text-slate-300">{t('common.forbiddenBody')}</p>
      <ButtonLink to="/" size="lg" className="mt-6">
        {t('common.goHome')}
      </ButtonLink>
    </div>
  )
}
