import { Laptop } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useApiError } from '../../hooks/useApiError'
import { useAsync } from '../../hooks/useAsync'
import { useFormat } from '../../hooks/useFormat'
import { authApi } from '../../services/api'
import { useUi } from '../../store/ui'
import { Badge, Button, Card, Spinner } from '../ui'

/** Devices and sessions with revoke (FR-008). */
export function DeviceSessions() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const { data, loading, reload } = useAsync(() => authApi.devices(), [])
  return (
    <Card>
      <h2 className="text-lg font-semibold">{t('auth.devicesTitle')}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-300">{t('auth.devicesLead')}</p>
      {loading ? (
        <Spinner label={t('common.loading')} />
      ) : (
        <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
          {(data ?? []).map((d) => (
            <li key={d.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Laptop aria-hidden className="mt-0.5 size-5 text-slate-500" />
                <div>
                  <p className="font-medium">
                    {d.deviceLabel} {d.current && <Badge tone="success">{t('auth.thisDevice')}</Badge>}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t('auth.signedIn', { time: fmt.dateTime(d.createdAt) })} · {t('auth.lastActive', { time: fmt.relative(d.lastSeenAt) })}
                  </p>
                </div>
              </div>
              {!d.current && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await authApi.revokeDevice(d.id)
                      toast(t('auth.revoked'), 'success')
                      await reload()
                    } catch (e) {
                      apiError.show(e)
                    }
                  }}
                >
                  {t('auth.revoke')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
