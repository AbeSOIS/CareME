import { useEffect, useMemo, useState } from 'react'
import { Plus, Siren, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { TrendChart } from '../../components/charts/TrendChart'
import { AppointmentStatusBadge } from '../../components/feature/AppointmentStatusBadge'
import { AssessmentForm } from '../../components/forms/AssessmentForm'
import { IntakeForm } from '../../components/forms/IntakeForm'
import { scaleTotal } from '../../components/forms/RatingScale'
import { ScreeningForm } from '../../components/forms/ScreeningForm'
import { Badge, Button, ButtonLink, Callout, Card, DataTable, EmptyState, Input, Modal, PageHeader, Select, Spinner, Tabs, TextArea } from '../../components/ui'
import { PROBLEM_SCALE_OPTIONS, SYMPTOM_SECTION } from '../../config/forms'
import { ageOn, isMinor } from '../../domain/age'
import { canJoin } from '../../domain/bookingRules'
import { useApiError } from '../../hooks/useApiError'
import { useFormat } from '../../hooks/useFormat'
import { useLookups } from '../../hooks/useLookups'
import { alertsApi, casesApi, referralsApi } from '../../services/api'
import { useAuth } from '../../store/auth'
import { useCases } from '../../store/cases'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import type { CaseRecord, Referral, SessionCategory, SessionMode } from '../../types'

const CATEGORIES: SessionCategory[] = ['mentalDisorder', 'family', 'relationship', 'education', 'economic', 'drugRelated']
const TABS = ['overview', 'screening', 'intake', 'assessment', 'notes', 'referrals', 'followUps'] as const

export default function CasePage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const { districtName, dsName, provinceOf } = useLookups()
  const settings = useSettings((s) => s.settings)
  const user = useAuth((s) => s.session?.user)
  const { current, loading, open, applyRecord } = useCases()
  const tab = (TABS as readonly string[]).includes(params.get('tab') ?? '') ? (params.get('tab') as (typeof TABS)[number]) : 'overview'
  const setTab = (next: string) => setParams((p) => ({ ...Object.fromEntries(p), tab: next }), { replace: true })
  const [riskOpen, setRiskOpen] = useState(false)
  const [riskNote, setRiskNote] = useState('')
  const [note, setNote] = useState({ note: '', category: 'family' as SessionCategory, mode: 'video' as SessionMode, durationMin: 50, appointmentId: '' })
  const [followUp, setFollowUp] = useState({ title: '', dueDate: '' })
  const [outbound, setOutbound] = useState({ destination: '', reason: '', urgency: 'routine' as Referral['urgency'] })

  useEffect(() => {
    if (id) void open(id).catch((e) => apiError.show(e))
  }, [id, open, apiError])

  const progress = useMemo(() => {
    if (!current) return []
    const ratings = (current.record.intake?.ratings ?? []).map((r) => ({
      date: r.date,
      label: fmt.date(r.date),
      emotional: scaleTotal(r.emotional as Record<string, string>, PROBLEM_SCALE_OPTIONS),
      behavioural: scaleTotal(r.behavioural as Record<string, string>, PROBLEM_SCALE_OPTIONS),
    }))
    return ratings.sort((a, b) => a.date.localeCompare(b.date))
  }, [current, fmt])

  if (loading && !current) return <Spinner label={t('common.loading')} />
  if (!current) return <Callout tone="danger">{t('errors.forbidden')}</Callout>

  const { record, beneficiary: b, appointments, referrals, selfAssessments } = current
  const age = b.dateOfBirth ? ageOn(b.dateOfBirth) : undefined
  const minor = isMinor(b.dateOfBirth, settings.minorAgeThreshold)
  const counselling = b.consents.find((c) => c.purpose === 'counselling' && !c.withdrawnAt)
  const saved = (r: CaseRecord) => applyRecord(r)
  const joinable = appointments.find((a) => canJoin(a))
  const prefill = {
    counsellorName: user?.displayName ?? '',
    sex: b.gender === 'female' || b.gender === 'male' ? b.gender : '',
    age: age ?? null,
    dateOfBirth: b.dateOfBirth ?? '',
    district: districtName(b.districtId),
    province: provinceOf(b.districtId),
    dsDivision: dsName(b.dsDivisionId),
  } as const

  return (
    <>
      <Link to="/counsellor/cases" className="text-body-sm font-medium text-brand-800 hover:underline dark:text-brand-200">
        ← {t('portal.casesTitle')}
      </Link>
      <PageHeader
        title={b.fullName}
        lead={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono">{b.clientCode}</span>
            {age !== undefined && <Badge>{t('case.age', { age })}</Badge>}
            <Badge tone="brand">{t(`lang.${b.counsellingLanguage}`)}</Badge>
            {record.primaryCategory && <Badge>{t(`category.${record.primaryCategory}`)}</Badge>}
            {b.pendingRegistration && <Badge tone="info">{t('portal.pendingRegistration')}</Badge>}
            <Badge tone={record.status === 'open' ? 'success' : 'neutral'}>{record.status === 'open' ? t('common.open') : t('common.close')}</Badge>
          </span>
        }
        actions={
          <>
            {joinable && (
              <ButtonLink to={`/session/${joinable.id}`} icon={<Video aria-hidden className="size-5" />}>
                {t('portal.startSession')}
              </ButtonLink>
            )}
            <Button variant="danger" icon={<Siren aria-hidden className="size-5" />} onClick={() => setRiskOpen(true)}>
              {t('case.riskAlert')}
            </Button>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  saved(await casesApi.patch(record.id, { status: record.status === 'open' ? 'closed' : 'open' }))
                } catch (e) {
                  apiError.show(e)
                }
              }}
            >
              {record.status === 'open' ? t('case.closeCase') : t('case.reopenCase')}
            </Button>
          </>
        }
      />

      <div className="mb-4 space-y-2">
        {minor && (
          <Callout tone={b.guardianConsent?.consentGiven ? 'info' : 'danger'}>
            {b.guardianConsent?.consentGiven ? `${t('case.guardianOk')}: ${b.guardianConsent.guardianName} (${t(`booking.relationships.${b.guardianConsent.relationship}`)})` : t('case.guardianMissing')}
          </Callout>
        )}
        {!counselling && <Callout tone="warning">{t('case.consentMissing')}</Callout>}
      </div>

      <Card>
        <Tabs label={t('case.title')} active={tab} onChange={setTab} tabs={TABS.map((x) => ({ id: x, label: t(`case.tabs.${x}`), badge: x === 'screening' && !record.screening ? <span className="size-2 rounded-full bg-amber-500" aria-label={t('case.notStarted')} /> : null }))}>
          {tab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-h3">{t('case.progress')}</h2>
                <p className="mb-3 text-body-sm text-slate-600 dark:text-slate-300">{t('case.progressLead')}</p>
                {progress.length ? (
                  <TrendChart
                    title={t('case.progress')}
                    data={progress}
                    xKey="label"
                    xLabel={t('common.date')}
                    series={[
                      { key: 'emotional', label: `${t('case.emotionalTotal')} /30` },
                      { key: 'behavioural', label: `${t('case.behaviouralTotal')} /18` },
                    ]}
                    height={240}
                  />
                ) : (
                  <EmptyState>{t('case.noProgress')}</EmptyState>
                )}
                {record.assessments.length > 0 && (
                  <p className="mt-3 text-body-sm">
                    {t('case.symptomTotal')}:{' '}
                    {record.assessments.map((a) => `${fmt.date(a.date)} — ${scaleTotal(a.symptoms as Record<string, string>, SYMPTOM_SECTION.options)}/30`).join(' · ')}
                  </p>
                )}
              </div>
              <div>
                <h2 className="mb-3 text-h3">{t('case.sessionHistory')}</h2>
                <DataTable
                  caption={t('case.sessionHistory')}
                  rows={appointments}
                  rowKey={(a) => a.id}
                  columns={[
                    { key: 'date', header: t('common.date'), primary: true, render: (a) => `${fmt.date(a.start)} · ${fmt.time(a.start)}` },
                    { key: 'n', header: t('portal.session'), render: (a) => `${a.sessionNumber}/${settings.maxSessionsPerClient}` },
                    { key: 'mode', header: t('portal.mode'), render: (a) => t(`booking.modes.${a.mode}`) },
                    { key: 'dur', header: t('portal.duration'), render: (a) => t('common.minutes', { count: a.durationMin }) },
                    { key: 'status', header: t('common.status'), render: (a) => <AppointmentStatusBadge status={a.status} /> },
                  ]}
                />
              </div>
              {selfAssessments.length > 0 && (
                <div>
                  <h2 className="mb-3 text-h3">{t('case.selfAssessments')}</h2>
                  <ul className="flex flex-wrap gap-2">
                    {selfAssessments.map((s) => (
                      <li key={s.id}>
                        <Badge tone="info">
                          {fmt.date(s.completedAt)} · {t(`assess.${s.tool}`)} · {t(`assess.bands.${s.bandKey}`)} ({s.score})
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === 'screening' && <ScreeningForm key={record.id} record={record} prefill={prefill} onSaved={saved} updatedAt={record.updatedAt} />}
          {tab === 'intake' && <IntakeForm key={record.id} record={record} counsellorName={user?.displayName ?? ''} onSaved={saved} />}
          {tab === 'assessment' && <AssessmentForm key={record.id} record={record} counsellorName={user?.displayName ?? ''} onSaved={saved} />}

          {tab === 'notes' && (
            <div className="space-y-6">
              <Callout tone="info">{t('case.notesPrivate')}</Callout>
              <form
                className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!note.note.trim()) return
                  try {
                    saved(
                      await casesApi.addNote(record.id, {
                        note: note.note,
                        category: note.category,
                        mode: note.mode,
                        durationMin: Math.min(note.durationMin, settings.maxSessionDurationMin),
                        appointmentId: note.appointmentId || undefined,
                        date: new Date().toISOString(),
                      }),
                    )
                    setNote({ ...note, note: '', appointmentId: '' })
                    toast(t('case.noteAdded'), 'success')
                  } catch (err) {
                    apiError.show(err)
                  }
                }}
              >
                <div className="grid gap-4 sm:grid-cols-4">
                  <Select
                    label={t('portal.session')}
                    value={note.appointmentId}
                    onChange={(e) => setNote({ ...note, appointmentId: e.target.value })}
                    placeholder="—"
                    options={appointments.filter((a) => a.status === 'completed').map((a) => ({ value: a.id, label: `${a.sessionNumber} · ${fmt.date(a.start)}` }))}
                  />
                  <Select label={t('case.category')} value={note.category} onChange={(e) => setNote({ ...note, category: e.target.value as SessionCategory })} options={CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}`) }))} />
                  <Select label={t('portal.mode')} value={note.mode} onChange={(e) => setNote({ ...note, mode: e.target.value as SessionMode })} options={(['video', 'audio', 'chat', 'inPerson'] as const).map((m) => ({ value: m, label: t(`booking.modes.${m}`) }))} />
                  <Input label={t('portal.duration')} type="number" min={5} max={settings.maxSessionDurationMin} value={note.durationMin} onChange={(e) => setNote({ ...note, durationMin: Number(e.target.value) })} />
                </div>
                <TextArea label={t('case.note')} required rows={4} value={note.note} onChange={(e) => setNote({ ...note, note: e.target.value })} />
                <Button type="submit" icon={<Plus aria-hidden className="size-4" />}>
                  {t('case.addNote')}
                </Button>
              </form>
              {record.notes.length === 0 ? (
                <EmptyState>{t('common.noResults')}</EmptyState>
              ) : (
                <ol className="space-y-3">
                  {[...record.notes].reverse().map((n) => (
                    <li key={n.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <div className="flex flex-wrap items-center gap-2 text-body-sm text-slate-600 dark:text-slate-400">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{fmt.dateTime(n.date)}</span>
                        <Badge>{t(`category.${n.category}`)}</Badge>
                        <Badge tone="brand">{t(`booking.modes.${n.mode}`)}</Badge>
                        <span>{t('common.minutes', { count: n.durationMin })}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-line">{n.note}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {tab === 'referrals' && (
            <div className="space-y-6">
              <DataTable
                caption={t('case.tabs.referrals')}
                rows={referrals}
                rowKey={(r) => r.id}
                columns={[
                  { key: 'dir', header: '', primary: true, render: (r) => (r.direction === 'inbound' ? t('referrals.inbound') : t('referrals.outbound')) },
                  { key: 'date', header: t('referrals.referralDate'), render: (r) => fmt.date(r.referralDate) },
                  { key: 'who', header: t('referrals.organisation'), render: (r) => r.sourceOrganisation ?? r.destination ?? '—' },
                  { key: 'reason', header: t('referrals.reason'), render: (r) => r.reason },
                  { key: 'status', header: t('common.status'), render: (r) => <Badge>{t(`referrals.statuses.${r.status}`)}</Badge> },
                ]}
              />
              <form
                className="space-y-4 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!outbound.destination.trim() || !outbound.reason.trim()) return
                  try {
                    await referralsApi.create({
                      direction: 'outbound',
                      destination: outbound.destination,
                      reason: outbound.reason,
                      urgency: outbound.urgency,
                      referralDate: new Date().toISOString().slice(0, 10),
                      beneficiaryId: b.id,
                      consentStatus: 'obtained',
                    })
                    setOutbound({ destination: '', reason: '', urgency: 'routine' })
                    toast(t('referrals.saved'), 'success')
                    await open(record.id)
                  } catch (err) {
                    apiError.show(err)
                  }
                }}
              >
                <h3 className="font-semibold">{t('case.outboundReferral')}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label={t('case.destination')} required value={outbound.destination} onChange={(e) => setOutbound({ ...outbound, destination: e.target.value })} />
                  <Select label={t('referrals.urgency')} value={outbound.urgency} onChange={(e) => setOutbound({ ...outbound, urgency: e.target.value as Referral['urgency'] })} options={(['routine', 'priority', 'urgent'] as const).map((u) => ({ value: u, label: t(`referrals.urgencies.${u}`) }))} />
                </div>
                <TextArea label={t('referrals.reason')} required value={outbound.reason} onChange={(e) => setOutbound({ ...outbound, reason: e.target.value })} />
                <Button type="submit">{t('referrals.save')}</Button>
              </form>
            </div>
          )}

          {tab === 'followUps' && (
            <div className="space-y-6">
              <form
                className="grid items-end gap-3 sm:grid-cols-[1fr_12rem_auto]"
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!followUp.title.trim() || !followUp.dueDate) return
                  try {
                    saved(await casesApi.addFollowUp(record.id, followUp))
                    setFollowUp({ title: '', dueDate: '' })
                  } catch (err) {
                    apiError.show(err)
                  }
                }}
              >
                <Input label={t('case.addFollowUp')} required value={followUp.title} onChange={(e) => setFollowUp({ ...followUp, title: e.target.value })} />
                <Input label={t('case.dueDate')} required type="date" value={followUp.dueDate} onChange={(e) => setFollowUp({ ...followUp, dueDate: e.target.value })} />
                <Button type="submit">{t('common.add')}</Button>
              </form>
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {record.followUps.map((f) => {
                  const overdue = f.status === 'open' && f.dueDate < new Date().toISOString().slice(0, 10)
                  return (
                    <li key={f.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className={f.status === 'done' ? 'text-slate-600 line-through dark:text-slate-400' : 'font-medium'}>{f.title}</p>
                        <p className="text-body-sm text-slate-600 dark:text-slate-400">
                          {t('case.dueDate')}: {fmt.date(f.dueDate)} {overdue && <Badge tone="danger">{t('case.overdue')}</Badge>} {f.status === 'done' && <Badge tone="success">{t('case.done')}</Badge>}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          try {
                            saved(await casesApi.setFollowUp(record.id, f.id, f.status === 'open' ? 'done' : 'open'))
                          } catch (err) {
                            apiError.show(err)
                          }
                        }}
                      >
                        {f.status === 'open' ? t('case.markDone') : t('case.reopen')}
                      </Button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </Tabs>
      </Card>

      <Modal
        open={riskOpen}
        onClose={() => setRiskOpen(false)}
        title={t('case.riskTitle')}
        description={t('case.riskLead')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRiskOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  await alertsApi.raise({ beneficiaryId: b.id, message: riskNote })
                  toast(t('case.riskSent'), 'success')
                  setRiskOpen(false)
                  setRiskNote('')
                } catch (e) {
                  apiError.show(e)
                }
              }}
            >
              {t('case.riskAlert')}
            </Button>
          </>
        }
      >
        <TextArea label={t('case.riskNote')} value={riskNote} onChange={(e) => setRiskNote(e.target.value)} />
      </Modal>
    </>
  )
}
