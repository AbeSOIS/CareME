import { Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUi } from '../../store/ui'

export function ThemeToggle() {
  const { t } = useTranslation()
  const theme = useUi((s) => s.theme)
  const toggle = useUi((s) => s.toggleTheme)
  const label = theme === 'dark' ? t('common.lightMode') : t('common.darkMode')
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex size-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      {theme === 'dark' ? <Sun aria-hidden className="size-5" /> : <Moon aria-hidden className="size-5" />}
    </button>
  )
}
