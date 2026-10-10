import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '../../hooks/useFormat'
import { EMERGENCY_NUMBERS } from '../../config/defaults'
import { useAlerts } from '../../store/alerts'
import { Badge, Button, Callout } from '../ui'

/** Status of the alert this person raised (FR-055: show 119 once escalated). Polls every 10 s. */
export function AlertStatusCard() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const raisedId = useAlerts((s) => s.raisedId)
  const status = useAlerts((s) => s.raisedStatus)
  const poll = useAlerts((s) => s.pollRaised)
  const clear = useAlerts((s) => s.clearRaised)

  useEffect(() => {
    if (!raisedId) return
    void poll()
    const id = setInterval(() => void poll(), 10_000)
    return () => clearInterval(id)
  }, [raisedId, poll])

  if (!raisedId || !status) return null
  const tone = status.status === 'closed' ? 'success' : status.escalated ? 'danger' : status.acknowledged ? 'info' : 'warning'
  const text =
    status.status === 'closed' ? t('emergency.statusClosed') : status.escalated && !status.acknowledged ? t('emergency.statusEscalated') : status.acknowledged ? t('emergency.statusAcknowledged') : t('emergency.statusOpen')

  return (
    <Callout tone={tone} role="status" title={t('emergency.statusTitle')}>
      <p aria-live="polite">{text}</p>
      <p className="mt-1 text-caption">
        <Badge>{t('emergency.raisedAt', { time: fmt.relative(status.raisedAt) })}</Badge>
      </p>
      {status.escalated && status.status !== 'closed' && (
        <a href={`tel:${EMERGENCY_NUMBERS[0].number}`} className="mt-3 inline-flex min-h-13 items-center gap-2 rounded-xl bg-red-600 px-5 text-body font-bold text-white">
          {t('emergency.call', { number: EMERGENCY_NUMBERS[0].number })}
        </a>
      )}
      {status.status === 'closed' && (
        <Button size="sm" variant="ghost" className="mt-2" onClick={clear}>
          {t('emergency.dismiss')}
        </Button>
      )}
    </Callout>
  )
}
