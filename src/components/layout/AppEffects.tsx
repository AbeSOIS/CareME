import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { alertsApi } from '../../services/api'
import { useAuth } from '../../store/auth'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'

/**
 * App-wide side effects: keep i18next, <html lang> and the dark class in sync with
 * the UI store; load settings; and run the escalation ticker that stands in for a
 * server-side job (FR-055).
 */
export function AppEffects() {
  const { i18n } = useTranslation()
  const language = useUi((s) => s.language)
  const theme = useUi((s) => s.theme)
  const loadSettings = useSettings((s) => s.load)
  const session = useAuth((s) => s.session)
  const refresh = useAuth((s) => s.refresh)

  useEffect(() => {
    void i18n.changeLanguage(language)
    document.documentElement.lang = language
  }, [i18n, language])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
  }, [theme])

  useEffect(() => {
    void loadSettings().catch(() => undefined)
  }, [loadSettings])

  useEffect(() => {
    const tick = () => void alertsApi.tick().catch(() => undefined)
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  // Re-check roles on load and every 5 minutes so a roster change applies without re-login.
  useEffect(() => {
    if (!session) return
    void refresh().catch(() => undefined)
    const id = setInterval(() => void refresh().catch(() => undefined), 300_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token, refresh])

  return null
}
