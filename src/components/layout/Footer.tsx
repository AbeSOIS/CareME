import { useTranslation } from 'react-i18next'
import { Phone } from 'lucide-react'
import { EMERGENCY_NUMBERS } from '../../config/defaults'
import { resetDemoData } from '../../services/storage'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'

export function Footer() {
  const { t } = useTranslation()
  const toast = useUi((s) => s.toast)
  const logout = useAuth((s) => s.logout)
  return (
    // pb-28 clears the fixed EmergencyButton (bottom-4 + 52px) so it never covers the footer.
    <footer className="mt-16 bg-brand-950 pb-28 text-slate-200">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 md:grid-cols-[1.5fr_1fr_auto]">
        <div className="space-y-2">
          <p className="text-body font-semibold text-white">{t('app.division')}</p>
          <p className="text-body-sm text-slate-300">{t('app.ministry')}</p>
          <p className="text-body-sm text-slate-300">{t('common.footerPrivacy')}</p>
        </div>

        <div className="space-y-2">
          <p className="text-body font-semibold text-white">{t('common.footerEmergency')}</p>
          <ul className="space-y-1">
            {EMERGENCY_NUMBERS.map((n) => (
              <li key={n.key}>
                <a
                  href={`tel:${n.number}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl text-body-sm font-semibold text-white hover:underline"
                >
                  <Phone aria-hidden className="size-4 shrink-0" />
                  <span className="tabular-nums">{n.number}</span>
                  <span className="font-normal text-slate-300">{t(`emergency.numbers.${n.key}`)}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="text-caption text-slate-400">{t('common.emergencyAlwaysAvailable')}</p>
        </div>

        <div className="space-y-3">
          <p className="text-caption text-slate-400">{t('app.prototype')}</p>
          <button
            type="button"
            className="min-h-11 rounded-xl border border-slate-500 px-4 text-body-sm font-medium text-white transition-colors duration-150 hover:bg-white/10"
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
      </div>
    </footer>
  )
}
