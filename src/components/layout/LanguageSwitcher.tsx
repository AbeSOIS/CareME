import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Globe } from 'lucide-react'
import { LANGUAGES } from '../../i18n'
import { authApi } from '../../services/api'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'
import type { LanguageCode } from '../../types'
import { cn } from '../ui'

/** Three-way language switch (FR-015). Each option is labelled in its own script. */
export function LanguageSwitcher({ className, variant = 'buttons' }: { className?: string; variant?: 'buttons' | 'dropdown' }) {
  const { t } = useTranslation()
  const language = useUi((s) => s.language)
  const setLanguage = useUi((s) => s.setLanguage)
  const session = useAuth((s) => s.session)
  const updateUser = useAuth((s) => s.updateUser)

  const choose = (lang: typeof language) => {
    setLanguage(lang)
    if (session) void authApi.setLanguage(lang).then(updateUser).catch(() => undefined)
  }

  if (variant === 'dropdown') return <LanguageDropdown className={className} language={language} choose={choose} />

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
            'min-h-11 rounded-xl px-3 text-body-sm font-semibold transition-colors duration-150',
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

/**
 * Compact single-button version for tight spaces (the header nav-right cluster): one
 * trigger showing the current language, opening a small menu with the other two —
 * same three languages and the same `choose` handler as the button-row variant above,
 * just collapsed behind a click instead of always taking three slots of width.
 */
function LanguageDropdown({
  className,
  language,
  choose,
}: {
  className?: string
  language: LanguageCode
  choose: (lang: LanguageCode) => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t('common.language')}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-body-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <Globe aria-hidden className="size-4 shrink-0" />
        <span lang={language}>{t(`lang.${language}`)}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0" />
      </button>
      {open && (
        <div role="menu" aria-label={t('common.language')} className="absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              role="menuitemradio"
              aria-checked={language === lang}
              lang={lang}
              onClick={() => {
                choose(lang)
                setOpen(false)
              }}
              className="flex min-h-11 w-full items-center justify-between gap-2 px-4 text-left text-body-sm hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {t(`lang.${lang}`)}
              {language === lang && <Check aria-hidden className="size-4 text-brand-700 dark:text-brand-300" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
