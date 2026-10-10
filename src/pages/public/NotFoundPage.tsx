import { useTranslation } from 'react-i18next'
import { ButtonLink } from '../../components/ui'

/** Friendly inline-SVG illustration: no remote images, and nothing distressing. */
function LostShape() {
  return (
    <svg aria-hidden viewBox="0 0 200 140" className="mx-auto w-56 max-w-full">
      <circle cx="100" cy="70" r="54" className="fill-brand-100 dark:fill-brand-900" />
      <path d="M40 112c22-14 98-14 120 0" className="stroke-brand-300 dark:stroke-brand-700" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="82" cy="62" r="5" className="fill-brand-700 dark:fill-brand-300" />
      <circle cx="118" cy="62" r="5" className="fill-brand-700 dark:fill-brand-300" />
      <path d="M84 88c10-7 22-7 32 0" className="stroke-brand-700 dark:stroke-brand-300" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  )
}

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <LostShape />
      <h1 className="mt-6 text-h1">{t('common.pageNotFound')}</h1>
      <p className="mx-auto mt-2 max-w-prose text-body text-slate-600 dark:text-slate-300">{t('common.pageNotFoundBody')}</p>
      <ButtonLink to="/" size="lg" className="mt-6">
        {t('common.goHome')}
      </ButtonLink>
    </div>
  )
}
