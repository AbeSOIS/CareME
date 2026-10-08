import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { LANGUAGES } from '../../i18n'
import { authApi } from '../../services/api'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'
import { cn } from '../ui'

/** Three-way language switch (FR-015). Each option is labelled in its own script. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { t } = useTranslation()
  const language = useUi((s) => s.language)
  const setLanguage = useUi((s) => s.setLanguage)
  const session = useAuth((s) => s.session)
  const updateUser = useAuth((s) => s.updateUser)

  const choose = (lang: typeof language) => {
    setLanguage(lang)
    if (session) void authApi.setLanguage(lang).then(updateUser).catch(() => undefined)
  }

  return (
    <div role="group" aria-label={t('common.language')} className={cn('inline-flex items-center gap-1', className)}>
      <Globe aria-hidden className="mr-1 hidden size-4 text-slate-500 sm:block dark:text-slate-400" />
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          lang={lang}
          aria-pressed={language === lang}
          onClick={() => choose(lang)}
          className={cn(
            'min-h-9 rounded-md px-2.5 text-sm font-semibold transition-colors',
            language === lang
              ? 'bg-brand-700 text-white dark:bg-brand-400 dark:text-slate-950'
              : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
          )}
        >
          {t(`lang.${lang}`)}
        </button>
      ))}
    </div>
  )
}
