import { useTranslation } from 'react-i18next'
import { resetDemoData } from '../../services/storage'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'

export function Footer() {
  const { t } = useTranslation()
  const toast = useUi((s) => s.toast)
  const logout = useAuth((s) => s.logout)
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white pb-24 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
        <div className="space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">{t('app.ministry')}</p>
          <p>{t('common.emergencyAlwaysAvailable')}</p>
          <p className="text-xs">{t('app.prototype')}</p>
        </div>
        <button
          type="button"
          className="min-h-10 self-start rounded-lg border border-slate-300 px-3 font-medium hover:bg-slate-50 sm:self-auto dark:border-slate-600 dark:hover:bg-slate-800"
          onClick={async () => {
            if (!window.confirm(t('common.resetDemoConfirm'))) return
            await logout('expired')
            resetDemoData()
            toast(t('common.resetDone'), 'success')
            window.location.assign('/')
          }}
        >
          {t('common.resetDemo')}
        </button>
      </div>
    </footer>
  )
}
