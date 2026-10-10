import { useEffect, useMemo, useState } from 'react'
import { parseISO } from 'date-fns'
import { CalendarPlus, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppointmentStatusBadge } from '../../components/feature/AppointmentStatusBadge'
import { SlotPicker } from '../../components/feature/SlotPicker'
import { Badge, Button, ButtonLink, Callout, Card, EmptyState, Modal, PageHeader, Spinner, Tabs } from '../../components/ui'
import { COUNTS_TOWARDS_CAP, canJoin, canReschedule, cancellationDecision } from '../../domain/bookingRules'
import { isBookable } from '../../domain/slots'
import { useApiError } from '../../hooks/useApiError'
import { useFormat } from '../../hooks/useFormat'
import { useNow } from '../../hooks/useNow'
import { bookingApi } from '../../services/api'
import { useAppointments } from '../../store/appointments'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import type { AppointmentView, Slot } from '../../types'

export function MyAppointmentsPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const now = useNow(15_000)
  const apiError = useApiError()
  const toast = useUi((s) => s.toast)
  const settings = useSettings((s) => s.settings)
  const { mine, loading, loadMine, cancel, upsert } = useAppointments()
  const [tab, setTab] = useState('upcoming')
  const [cancelTarget, setCancelTarget] = useState<AppointmentView | null>(null)
  const [moveTarget, setMoveTarget] = useState<AppointmentView | null>(null)
  const [slots, setSlots] = useState<Slot[]>([])
  const [newSlot, setNewSlot] = useState<Slot | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void loadMine()
  }, [loadMine])

  const upcoming = useMemo(() => mine.filter((a) => ['requested', 'confirmed'].includes(a.status) && parseISO(a.start).getTime() + a.durationMin * 60_000 > now.getTime()).sort((a, b) => a.start.localeCompare(b.start)), [mine, now])
  const rest = useMemo(() => mine.filter((a) => !upcoming.includes(a)), [mine, upcoming])
  const cancelledList = useMemo(() => rest.filter((a) => ['cancelled', 'lateCancelled', 'rejected'].includes(a.status)), [rest])
  const past = useMemo(() => rest.filter((a) => !cancelledList.includes(a)), [rest, cancelledList])
  const used = mine.filter((a) => COUNTS_TOWARDS_CAP.has(a.status)).length
  const decision = cancelTarget ? cancellationDecision(cancelTarget, settings.cancellationNoticeHours, now) : 'ok'

  const doCancel = async () => {
    if (!cancelTarget) return
    setBusy(true)
    try {
      await cancel(cancelTarget.id, decision === 'late')
      toast(t('appointments.cancelled'), 'success')
      setCancelTarget(null)
    } catch (e) {
      apiError.show(e)
    } finally {
      setBusy(false)
    }
  }

  const openMove = async (a: AppointmentView) => {
    setMoveTarget(a)
    setNewSlot(null)
    setSlots([])
    try {
      const { slots: s } = await bookingApi.counsellor(a.counsellorId)
      setSlots(s.filter(isBookable))
    } catch (e) {
      apiError.show(e)
    }
  }

  const doMove = async () => {
    if (!moveTarget || !newSlot) return
    setBusy(true)
    try {
      upsert(await bookingApi.reschedule(moveTarget.id, newSlot.id))
      toast(t('appointments.rescheduled'), 'success')
      setMoveTarget(null)
    } catch (e) {
      apiError.show(e)
    } finally {
      setBusy(false)
    }
  }

  const list = tab === 'upcoming' ? upcoming : tab === 'cancelled' ? cancelledList : past
  const next = upcoming[0]
  const max = settings.maxSessionsPerClient

  return (
    <>
      <PageHeader
        title={t('appointments.title')}
        lead={
          <span className="block">
            <span className="block">{t('appointments.sessionsUsed', { used, max })}</span>
            <span className="mt-2 block h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden>
              <span className="block h-full bg-brand-600 dark:bg-brand-400" style={{ width: `${max ? Math.min(100, (used / max) * 100) : 0}%` }} />
            </span>
          </span>
        }
        actions={
          <ButtonLink to="/counsellors" icon={<CalendarPlus aria-hidden className="size-5" />}>
            {t('appointments.bookNew')}
          </ButtonLink>
        }
      />

      {next && (
        <section aria-labelledby="next-session" className="mb-6 rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:p-6 dark:border-brand-800 dark:bg-slate-900">
          <h2 id="next-session" className="text-caption font-semibold tracking-wide text-brand-800 uppercase dark:text-brand-200">
            {t('appointments.nextSession')}
          </h2>
          <p className="mt-2 text-h2 text-slate-900 dark:text-white">
            {fmt.dateLong(next.start)} · {fmt.time(next.start)}
          </p>
          <p className="mt-1 text-body text-slate-700 dark:text-slate-200">
            {next.counsellorName} · {t(`booking.modes.${next.mode}`)} · {t(`lang.${next.language}`)}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <AppointmentStatusBadge status={next.status} />
            {canJoin(next, now) ? (
              <ButtonLink to={`/session/${next.id}`} size="lg" icon={<Video aria-hidden className="size-5" />}>
                {t('appointments.join')}
              </ButtonLink>
            ) : (
              next.status === 'confirmed' && <span className="text-body-sm text-slate-600 dark:text-slate-300">{t('appointments.joinOpens')}</span>
            )}
          </div>
        </section>
      )}
      <Tabs
        label={t('appointments.title')}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'upcoming', label: t('appointments.upcoming'), badge: upcoming.length ? <span className="rounded-full bg-brand-100 px-2 text-caption text-brand-900">{upcoming.length}</span> : null },
          { id: 'past', label: t('appointments.past') },
          { id: 'cancelled', label: t('appointments.cancelledTab') },
        ]}
      >
        {loading && !mine.length ? (
          <Spinner label={t('common.loading')} />
        ) : list.length === 0 ? (
          <EmptyState>{t('appointments.none')}</EmptyState>
        ) : (
          <ul className="space-y-3">
            {list.map((a) => {
              const joinable = canJoin(a, now)
              const reschedulable = canReschedule(a, settings.cancellationNoticeHours, now)
              const cancellable = cancellationDecision(a, settings.cancellationNoticeHours, now) !== 'notAllowed'
              return (
                <Card as="li" key={a.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      {next && a.id === next.id && <Badge tone="brand">{t('appointments.nextSession')}</Badge>}
                      <AppointmentStatusBadge status={a.status} />
                      <span className="text-body-sm text-slate-600 dark:text-slate-300">
                        {t('portal.session')} {a.sessionNumber}/{settings.maxSessionsPerClient}
                      </span>
                    </div>
                    <p className="mt-2 text-h3">
                      {fmt.dateLong(a.start)} · {fmt.time(a.start)}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      {a.counsellorName} · {t(`booking.modes.${a.mode}`)} · {t(`lang.${a.language}`)}
                    </p>
                    {a.status === 'confirmed' && !joinable && tab === 'upcoming' && <p className="mt-1 text-body-sm text-slate-600 dark:text-slate-300">{t('appointments.joinOpens')}</p>}
                  </div>
                  {tab === 'upcoming' && (
                    <div className="flex flex-wrap gap-2">
                      {joinable && (
                        <ButtonLink to={`/session/${a.id}`} icon={<Video aria-hidden className="size-5" />}>
                          {t('appointments.join')}
                        </ButtonLink>
                      )}
                      <Button
                        variant="secondary"
                        disabled={!reschedulable}
                        onClick={() => openMove(a)}
                        title={reschedulable ? undefined : t('appointments.rescheduleBlocked', { hours: settings.cancellationNoticeHours })}
                      >
                        {t('appointments.reschedule')}
                      </Button>
                      {cancellable && (
                        <Button variant="ghost" onClick={() => setCancelTarget(a)}>
                          {t('appointments.cancel')}
                        </Button>
                      )}
                    </div>
                  )}
                  {tab === 'upcoming' && !reschedulable && (
                    <p className="text-caption text-slate-600 sm:hidden dark:text-slate-300">{t('appointments.rescheduleBlocked', { hours: settings.cancellationNoticeHours })}</p>
                  )}
                </Card>
              )
            })}
          </ul>
        )}
      </Tabs>

      <Modal
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        alert
        title={decision === 'late' ? t('appointments.lateTitle', { hours: settings.cancellationNoticeHours }) : t('appointments.cancelTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)} autoFocus>
              {t('appointments.keep')}
            </Button>
            <Button variant="danger" loading={busy} onClick={doCancel}>
              {decision === 'late' ? t('appointments.cancelAnyway') : t('appointments.cancel')}
            </Button>
          </>
        }
      >
        {decision === 'late' ? (
          <Callout tone="warning">{t('appointments.lateBody', { max: settings.maxSessionsPerClient })}</Callout>
        ) : (
          <p>{t('appointments.cancelBody')}</p>
        )}
      </Modal>

      <Modal
        open={Boolean(moveTarget)}
        onClose={() => setMoveTarget(null)}
        size="lg"
        title={t('appointments.rescheduleTitle')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setMoveTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button disabled={!newSlot} loading={busy} onClick={doMove}>
              {t('common.confirm')}
            </Button>
          </>
        }
      >
        {slots.length ? <SlotPicker slots={slots} value={newSlot?.id ?? null} onChange={setNewSlot} label={t('appointments.rescheduleTitle')} /> : <Spinner label={t('common.loading')} />}
      </Modal>
    </>
  )
}
