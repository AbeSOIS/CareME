import { useTranslation } from 'react-i18next'

export function SkipLink() {
  const { t } = useTranslation()
  return (
    <a
      href="#main"
      className="sr-only rounded-lg bg-brand-700 px-4 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[60]"
    >
      {t('app.skipToContent')}
    </a>
  )
}
