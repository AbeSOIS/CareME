import { useTranslation } from 'react-i18next'
import { ButtonLink } from '../../components/ui'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="text-5xl font-bold text-brand-700 dark:text-brand-300">404</p>
      <h1 className="mt-4 text-2xl font-bold">{t('common.pageNotFound')}</h1>
      <p className="mt-2 text-slate-600 dark:text-slate-300">{t('common.pageNotFoundBody')}</p>
      <ButtonLink to="/" className="mt-6">
        {t('common.goHome')}
      </ButtonLink>
    </div>
  )
}
