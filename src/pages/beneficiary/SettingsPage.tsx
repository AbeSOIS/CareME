import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LanguageSwitcher } from '../../components/layout/LanguageSwitcher'
import { Badge, Button, Callout, Card, Checkbox, PageHeader, Spinner } from '../../components/ui'
import { useApiError } from '../../hooks/useApiError'
import { useAsync } from '../../hooks/useAsync'
import { useFormat } from '../../hooks/useFormat'
import { beneficiaryApi } from '../../services/api'
import { useUi } from '../../store/ui'
import type { NotificationChannel, NotificationPreferences, NotificationType } from '../../types'

const TYPES: NotificationType[] = ['appointmentReminder', 'appointmentChange', 'resourceUpdates', 'generalNotices']
const CHANNELS: NotificationChannel[] = ['sms', 'email', 'push']

export function SettingsPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const profile = useAsync(() => beneficiaryApi.profile(), [])
  if (!profile.data) return <Spinner label={t('common.loading')} />
  const b = profile.data
  const prefs = b.notificationPrefs

  const savePrefs = async (next: NotificationPreferences) => {
    try {
      profile.setData(await beneficiaryApi.updateProfile({ notificationPrefs: next }))
      toast(t('common.saved'), 'success')
    } catch (e) {
      apiError.show(e)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t('profile.settingsTitle')} />
      <Card>
        <h2 className="text-h3">{t('common.language')}</h2>
        <LanguageSwitcher className="mt-3" />
      </Card>

      <Card>
        <h2 className="text-h3">{t('profile.notificationsTitle')}</h2>
        <div className="mt-4 space-y-3">
          {TYPES.map((type) => (
            <Checkbox
              key={type}
              label={t(`profile.notificationTypes.${type}`)}
              checked={prefs.enabled[type]}
              onChange={(e) => savePrefs({ ...prefs, enabled: { ...prefs.enabled, [type]: e.target.checked } })}
            />
          ))}
        </div>
        <h3 className="mt-6 font-semibold">{t('profile.channelsTitle')}</h3>
        <div className="mt-3 flex flex-wrap gap-6">
          {CHANNELS.map((c) => (
            <Checkbox key={c} label={t(`profile.channels.${c}`)} checked={prefs.channels[c]} onChange={(e) => savePrefs({ ...prefs, channels: { ...prefs.channels, [c]: e.target.checked } })} />
          ))}
        </div>
        <Callout tone="info" className="mt-6" title={t('profile.minimalContent')}>
          <span className="inline-flex items-center gap-1">
            <Lock aria-hidden className="size-4" /> {t('profile.minimalContentBody')}
          </span>
        </Callout>
      </Card>

      <Card>
        <h2 className="text-h3">{t('profile.privacyTitle')}</h2>
        <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
          {b.consents.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{t(`profile.consentPurpose.${c.purpose}`)}</p>
                <p className="text-body-sm text-slate-600 dark:text-slate-400">
                  {c.withdrawnAt ? t('profile.consentWithdrawn', { date: fmt.date(c.withdrawnAt) }) : t('profile.consentGiven', { date: fmt.date(c.givenAt) })}{' '}
                  <Badge>{c.wordingVersion}</Badge>
                </p>
              </div>
              {!c.withdrawnAt && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    if (!window.confirm(t('profile.withdrawConfirm'))) return
                    try {
                      profile.setData(await beneficiaryApi.withdrawConsent(c.id))
                    } catch (e) {
                      apiError.show(e)
                    }
                  }}
                >
                  {t('profile.withdraw')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-h3">{t('profile.erasureTitle')}</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{t('profile.erasureBody')}</p>
        {b.erasureRequestedAt ? (
          <Callout tone="info" className="mt-4">
            {t('profile.erasureRequested', { date: fmt.date(b.erasureRequestedAt) })}
          </Callout>
        ) : (
          <Button
            variant="danger"
            className="mt-4"
            onClick={async () => {
              try {
                profile.setData(await beneficiaryApi.requestErasure())
              } catch (e) {
                apiError.show(e)
              }
            }}
          >
            {t('profile.erasureButton')}
          </Button>
        )}
      </Card>

      <Link to="/account/security" className="inline-block font-semibold text-brand-800 hover:underline dark:text-brand-200">
        {t('nav.security')} →
      </Link>
    </div>
  )
}
