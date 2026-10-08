import { useState } from 'react'
import { parseISO } from 'date-fns'
import { ArrowUpCircle, CheckCircle2, ClipboardCheck, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { nextEscalationAt } from '../../domain/alerts'
import { useApiError } from '../../hooks/useApiError'
import { useFormat } from '../../hooks/useFormat'
import { useNow } from '../../hooks/useNow'
import { alertsApi } from '../../services/api'
import { useAlerts } from '../../store/alerts'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import type { AlertOutcome, AlertView } from '../../types'
import { Badge, Button, Card, Checkbox, Input, Modal, Select, TextArea, type Tone } from '../ui'

const STATUS_TONE: Record<AlertView['status'], Tone> = { open: 'danger', acknowledged: 'warning', escalated: 'danger', closed: 'success' }

type OutcomeDraft = Omit<AlertOutcome, 'recordedAt' | 'recordedByUserId'>
const EMPTY: OutcomeDraft = { psychologicalFirstAid: false, individualCounselling: false, referral: 'none', referralDetails: '', externalServiceNotified: '', outcome: 'safe', summary: '' }

/** One alert in the Emergency Officer queue: acknowledge → escalate → record outcome (FR-054–056). */
export function AlertPanel({ alert, canAct }: { alert: AlertView; canAct: boolean }) {
  const { t } = useTranslation()
  const fmt = useFormat()
  const now = useNow(5_000)
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const upsert = useAlerts((s) => s.upsert)
  const period = useSettings((s) => s.settings.escalationPeriodMin)
  const [outcomeOpen, setOutcomeOpen] = useState(false)
  const [draft, setDraft] = useState<OutcomeDraft>(EMPTY)
  const waitingSec = (now.getTime() - parseISO(alert.raisedAt).getTime()) / 1000
  const nextEsc = nextEscalationAt(alert, period)

  const run = async (fn: () => Promise<AlertView>, msg: string) => {
    try {
      upsert(await fn())
      toast(msg, 'success')
    } catch (e) {
      apiError.show(e)
    }
  }

  return (
    <Card as="li" className={alert.status === 'open' || alert.status === 'escalated' ? 'border-red-300 dark:border-red-800' : undefined}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={STATUS_TONE[alert.status]}>{t(`alerts.status.${alert.status}`)}</Badge>
            <Badge tone="brand">{t(`alerts.source.${alert.source}`)}</Badge>
            {alert.clientCode && <span className="font-mono text-sm">{alert.clientCode}</span>}
            {alert.clientName && <span className="font-semibold">{alert.clientName}</span>}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('alerts.raised', { time: fmt.dateTime(alert.raisedAt) })}
            {!alert.acknowledgedAt && alert.status !== 'closed' && <strong className="ml-2 text-red-700 dark:text-red-400">{t('alerts.waiting', { duration: fmt.duration(waitingSec) })}</strong>}
            {alert.acknowledgedAt && ` · ${t('alerts.acknowledgedAt', { time: fmt.dateTime(alert.acknowledgedAt) })}`}
          </p>
          {alert.assignedOfficerName && <p className="text-sm">{t('alerts.assignedTo', { name: alert.assignedOfficerName })}</p>}
          {nextEsc && <p className="text-sm font-medium text-amber-800 dark:text-amber-300">{t('alerts.nextEscalation', { time: fmt.time(nextEsc) })}</p>}
          {alert.message && (
            <p className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
              <span className="sr-only">{t('alerts.message')}: </span>“{alert.message}”
            </p>
          )}
          <p className="flex items-center gap-2 text-sm">
            <Phone aria-hidden className="size-4" />
            {alert.contactPhone ? (
              <a href={`tel:${alert.contactPhone}`} className="font-semibold text-brand-800 underline dark:text-brand-200">
                {alert.contactPhone}
              </a>
            ) : (
              t('alerts.noContact')
            )}
          </p>
          {alert.escalations.length > 0 && (
            <ul className="space-y-1 text-sm">
              {alert.escalations.map((e) => (
                <li key={e.level} className="flex items-center gap-2 text-red-800 dark:text-red-300">
                  <ArrowUpCircle aria-hidden className="size-4" />
                  {fmt.time(e.at)} — {t('alerts.escalatedTo', { to: e.to, reason: e.reason === 'timeout' ? t('alerts.reasonTimeout') : t('alerts.reasonManual') })}
                </li>
              ))}
            </ul>
          )}
          {alert.outcome && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm dark:bg-emerald-950">
              <p className="font-semibold">
                {t('alerts.outcome')}: {t(`alerts.outcomes.${alert.outcome.outcome}`)}
              </p>
              <p>
                {alert.outcome.psychologicalFirstAid && `${t('alerts.pfa')} · `}
                {alert.outcome.individualCounselling && `${t('alerts.counselling')} · `}
                {t('alerts.referral')}: {t(`alerts.referrals.${alert.outcome.referral}`)}
              </p>
              {alert.outcome.summary && <p className="mt-1">{alert.outcome.summary}</p>}
            </div>
          )}
        </div>
        {canAct && alert.status !== 'closed' && (
          <div className="flex flex-wrap gap-2 lg:flex-col">
            {!alert.acknowledgedAt && (
              <Button icon={<CheckCircle2 aria-hidden className="size-5" />} onClick={() => run(() => alertsApi.ack(alert.id), t('alerts.acked'))}>
                {t('alerts.acknowledge')}
              </Button>
            )}
            <Button variant="secondary" icon={<ArrowUpCircle aria-hidden className="size-5" />} onClick={() => run(() => alertsApi.escalate(alert.id), t('alerts.escalatedToast'))}>
              {t('alerts.escalate')}
            </Button>
            <Button
              variant="secondary"
              icon={<ClipboardCheck aria-hidden className="size-5" />}
              onClick={() => {
                setDraft(EMPTY)
                setOutcomeOpen(true)
              }}
            >
              {t('alerts.recordOutcome')}
            </Button>
          </div>
        )}
      </div>

      <Modal
        open={outcomeOpen}
        onClose={() => setOutcomeOpen(false)}
        size="lg"
        title={t('alerts.outcomeTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOutcomeOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={async () => {
                await run(() => alertsApi.outcome(alert.id, draft), t('alerts.closed'))
                setOutcomeOpen(false)
              }}
            >
              {t('alerts.close')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Checkbox label={t('alerts.pfa')} checked={draft.psychologicalFirstAid} onChange={(e) => setDraft({ ...draft, psychologicalFirstAid: e.target.checked })} />
          <Checkbox label={t('alerts.counselling')} checked={draft.individualCounselling} onChange={(e) => setDraft({ ...draft, individualCounselling: e.target.checked })} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t('alerts.referral')}
              value={draft.referral}
              onChange={(e) => setDraft({ ...draft, referral: e.target.value as OutcomeDraft['referral'] })}
              options={(['none', 'hospital', 'police', 'protectivePlace', 'other'] as const).map((r) => ({ value: r, label: t(`alerts.referrals.${r}`) }))}
            />
            {draft.referral !== 'none' && <Input label={t('alerts.referralDetails')} value={draft.referralDetails} onChange={(e) => setDraft({ ...draft, referralDetails: e.target.value })} />}
            <Input label={t('alerts.externalNotified')} value={draft.externalServiceNotified} onChange={(e) => setDraft({ ...draft, externalServiceNotified: e.target.value })} />
            <Select
              label={t('alerts.outcome')}
              required
              value={draft.outcome}
              onChange={(e) => setDraft({ ...draft, outcome: e.target.value as OutcomeDraft['outcome'] })}
              options={(['safe', 'referred', 'ongoingSupport', 'unreachable', 'other'] as const).map((o) => ({ value: o, label: t(`alerts.outcomes.${o}`) }))}
            />
          </div>
          <TextArea label={t('alerts.summary')} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
        </div>
      </Modal>
    </Card>
  )
}
