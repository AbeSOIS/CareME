import { ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ButtonLink } from '../../components/ui'

export function ForbiddenPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <ShieldAlert aria-hidden className="mx-auto size-12 text-amber-600" />
      <h1 className="mt-4 text-2xl font-bold">{t('common.forbidden')}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">{t('common.forbiddenBody')}</p>
      <p className="mt-1 text-sm text-slate-500">403</p>
      <ButtonLink to="/" className="mt-6">
        {t('common.goHome')}
      </ButtonLink>
    </div>
  )
}
