import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useApiError } from '../../hooks/useApiError'
import { alertsApi } from '../../services/api'
import { useAlerts } from '../../store/alerts'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'
import { Button, Callout } from '../ui'

/** FR-058: the incoming Emergency Officer sees every open alert and confirms the handover. */
export function HandoverBanner() {
  const { t } = useTranslation()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const isOfficer = useAuth((s) => s.session?.effectiveRoles.includes('emergencyOfficer'))
  const handover = useAlerts((s) => s.handover)
  const loadHandover = useAlerts((s) => s.loadHandover)

  useEffect(() => {
    if (isOfficer) void loadHandover().catch(() => undefined)
  }, [isOfficer, loadHandover])

  if (!isOfficer || !handover || handover.acknowledgedAt) return null
  return (
    <Callout tone="warning" title={t('alerts.handoverTitle', { count: handover.openAlertIds.length })} className="mb-6">
      <p>{t('alerts.handoverBody')}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link to="/counsellor/alerts" className="inline-flex min-h-9 items-center rounded-lg border border-amber-400 px-3 text-body-sm font-semibold">
          {t('nav.alerts')}
        </Link>
        <Button
          size="sm"
          onClick={async () => {
            try {
              await alertsApi.ackHandover(handover.id)
              await loadHandover()
              toast(t('alerts.handoverDone'), 'success')
            } catch (e) {
              apiError.show(e)
            }
          }}
        >
          {t('alerts.handoverAck')}
        </Button>
      </div>
    </Callout>
  )
}
