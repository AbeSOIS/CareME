import { useEffect, useMemo, useState } from 'react'
import { parseISO } from 'date-fns'
import { Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppointmentStatusBadge } from '../../components/feature/AppointmentStatusBadge'
import { Button, ButtonLink, Card, EmptyState, Modal, PageHeader, Select, Spinner, Tabs, TextArea } from '../../components/ui'
import { canJoin } from '../../domain/bookingRules'
import { useApiError } from '../../hooks/useApiError'
import { useFormat } from '../../hooks/useFormat'
import { useNow } from '../../hooks/useNow'
import { counsellorApi } from '../../services/api'
import { useAppointments } from '../../store/appointments'
import { useAuth } from '../../store/auth'
import { useUi } from '../../store/ui'
import type { AppointmentView, Counsellor } from '../../types'

export default function CounsellorAppointments() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const now = useNow(15_000)
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const myId = useAuth((s) => s.session?.user.counsellorId)
  const { counsellor: apts, loading, loadCounsellor, upsert } = useAppointments()
  const [tab, setTab] = useState('requests')
  const [rejecting, setRejecting] = useState<AppointmentView | null>(null)
  const [reason, setReason] = useState('')
  const [reassigning, setReassigning] = useState<AppointmentView | null>(null)
  const [directory, setDirectory] = useState<Counsellor[]>([])
  const [target, setTarget] = useState('')

  useEffect(() => {
    void loadCounsellor()
  }, [loadCounsellor])

  const groups = useMemo(() => {
    const requests = apts.filter((a) => a.status === 'requested')
    const upcoming = apts.filter((a) => a.status === 'confirmed')
    const history = apts.filter((a) => !['requested', 'confirmed'].includes(a.status)).sort((a, b) => b.start.localeCompare(a.start))
    return { requests, upcoming, history }
  }, [apts])

  const act = async (fn: () => Promise<AppointmentView>, msg?: string) => {
    try {
      upsert(await fn())
      if (msg) toast(msg, 'success')
    } catch (e) {
      apiError.show(e)
    }
  }

  const list = groups[tab as keyof typeof groups]

  return (
    <>
      <PageHeader title={t('nav.appointments')} />
      <Tabs
        label={t('nav.appointments')}
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'requests', label: t('portal.requests'), badge: groups.requests.length ? <span className="rounded-full bg-amber-200 px-2 text-xs text-amber-950">{groups.requests.length}</span> : null },
          { id: 'upcoming', label: t('portal.upcoming') },
          { id: 'history', label: t('portal.history') },
        ]}
      >
        {loading && !apts.length ? (
          <Spinner label={t('common.loading')} />
        ) : !list.length ? (
          <EmptyState>{t('common.noResults')}</EmptyState>
        ) : (
          <ul className="space-y-3">
            {list.map((a) => {
              const started = parseISO(a.start) <= now
              return (
                <Card as="li" key={a.id} className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AppointmentStatusBadge status={a.status} />
                      <span className="font-mono text-sm text-slate-500">{a.clientCode}</span>
                    </div>
                    <p className="mt-1 text-lg font-semibold">
                      {fmt.dateLong(a.start)} · {fmt.time(a.start)}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      {a.clientName} · {t(`booking.modes.${a.mode}`)} · {t(`lang.${a.language}`)} · {t('portal.session')} {a.sessionNumber}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {a.status === 'requested' && (
                      <>
                        <Button size="sm" onClick={() => act(() => counsellorApi.accept(a.id), t('portal.accepted'))}>
                          {t('portal.accept')}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setRejecting(a)}>
                          {t('portal.reject')}
                        </Button>
                      </>
                    )}
                    {a.status === 'confirmed' && canJoin(a, now) && (
                      <ButtonLink to={`/session/${a.id}`} size="sm" icon={<Video aria-hidden className="size-4" />}>
                        {t('portal.startSession')}
                      </ButtonLink>
                    )}
                    {a.status === 'confirmed' && started && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => act(() => counsellorApi.complete(a.id))}>
                          {t('portal.complete')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => act(() => counsellorApi.noShow(a.id))}>
                          {t('portal.noShow')}
                        </Button>
                      </>
                    )}
                    {['requested', 'confirmed'].includes(a.status) && !started && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          setReassigning(a)
                          setTarget('')
                          try {
                            setDirectory((await counsellorApi.directory()).filter((c) => c.id !== myId && c.languages.includes(a.language)))
                          } catch (e) {
                            apiError.show(e)
                          }
                        }}
                      >
                        {t('portal.reassign')}
                      </Button>
                    )}
                    {a.caseId && (
                      <ButtonLink to={`/counsellor/cases/${a.caseId}`} size="sm" variant="ghost">
                        {t('portal.openCase')}
                      </ButtonLink>
                    )}
                  </div>
                </Card>
              )
            })}
          </ul>
        )}
      </Tabs>

      <Modal
        open={Boolean(rejecting)}
        onClose={() => setRejecting(null)}
        title={t('portal.reject')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejecting(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await act(() => counsellorApi.reject(rejecting!.id, reason), t('portal.rejected'))
                setRejecting(null)
                setReason('')
              }}
            >
              {t('portal.reject')}
            </Button>
          </>
        }
      >
        <TextArea label={t('portal.rejectReason')} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Modal>

      <Modal
        open={Boolean(reassigning)}
        onClose={() => setReassigning(null)}
        title={t('portal.reassignTitle')}
        description={reassigning ? t('portal.reassignLead', { language: t(`lang.${reassigning.language}`) }) : undefined}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReassigning(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={!target}
              onClick={async () => {
                await act(() => counsellorApi.reassign(reassigning!.id, target), t('portal.reassigned'))
                setReassigning(null)
                await loadCounsellor()
              }}
            >
              {t('portal.reassign')}
            </Button>
          </>
        }
      >
        <Select
          label={t('portal.reassignTo')}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="—"
          options={directory.map((c) => ({ value: c.id, label: `${c.fullName} (${c.districtId})` }))}
        />
      </Modal>
    </>
  )
}
