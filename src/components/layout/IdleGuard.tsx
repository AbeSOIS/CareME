import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useIdleTimeout } from '../../hooks/useIdleTimeout'
import { useAuth } from '../../store/auth'
import { useSettings } from '../../store/settings'
import { Button, Modal } from '../ui'

/** Signs the user out after the configured inactivity period (FR-007, SEC-010). */
export function IdleGuard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const session = useAuth((s) => s.session)
  const logout = useAuth((s) => s.logout)
  const { idleTimeoutMin, idleWarningSec } = useSettings((s) => s.settings)

  const { warning, secondsLeft, stay } = useIdleTimeout(Boolean(session), idleTimeoutMin, idleWarningSec, async () => {
    await logout('timeout')
    navigate('/login', { replace: true })
  })

  return (
    <Modal
      open={warning}
      onClose={stay}
      alert
      size="sm"
      title={t('auth.idleTitle')}
      description={<span aria-live="polite">{t('auth.idleBody', { seconds: secondsLeft })}</span>}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={async () => {
              await logout()
              navigate('/login', { replace: true })
            }}
          >
            {t('auth.logoutNow')}
          </Button>
          <Button onClick={stay} autoFocus>
            {t('auth.stayLoggedIn')}
          </Button>
        </>
      }
    >
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div className="h-full bg-brand-600 transition-[width]" style={{ width: `${(secondsLeft / idleWarningSec) * 100}%` }} />
      </div>
    </Modal>
  )
}
