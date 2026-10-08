import { useEffect, useState } from 'react'
import { CalendarDays, ClipboardCheck, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppointmentStatusBadge } from '../../components/feature/AppointmentStatusBadge'
import { Badge, Button, ButtonLink, Card, DataTable, Input, PageHeader, Select, Spinner } from '../../components/ui'
import { useApiError } from '../../hooks/useApiError'
import { useAsync } from '../../hooks/useAsync'
import { useFormat } from '../../hooks/useFormat'
import { useLookups } from '../../hooks/useLookups'
import { beneficiaryApi } from '../../services/api'
import { useAppointments } from '../../store/appointments'
import { useUi } from '../../store/ui'
import type { Beneficiary } from '../../types'

export function ProfilePage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const { districtOptions } = useLookups()
  const profile = useAsync(() => beneficiaryApi.profile(), [])
  const history = useAsync(() => beneficiaryApi.selfAssessments(), [])
  const { mine, loadMine } = useAppointments()
  const [draft, setDraft] = useState<Partial<Beneficiary>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void loadMine()
  }, [loadMine])
  useEffect(() => {
    if (profile.data) setDraft(profile.data)
  }, [profile.data])

  if (profile.loading || !profile.data) return <Spinner label={t('common.loading')} />
  const b = profile.data
  const next = mine.filter((a) => ['requested', 'confirmed'].includes(a.status) && new Date(a.start) > new Date()).sort((x, y) => x.start.localeCompare(y.start))[0]

  return (
    <>
      <PageHeader
        title={t('profile.welcome', { name: b.preferredName ?? b.fullName })}
        lead={
          <>
            {t('profile.clientCode')}: <span className="font-mono font-semibold">{b.clientCode}</span>
          </>
        }
        actions={
          <ButtonLink to="/me/settings" variant="secondary" icon={<Settings aria-hidden className="size-5" />}>
            {t('nav.settings')}
          </ButtonLink>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <CalendarDays aria-hidden className="size-5" /> {t('profile.nextAppointment')}
          </h2>
          {next ? (
            <div className="mt-3 space-y-1">
              <AppointmentStatusBadge status={next.status} />
              <p className="text-lg font-semibold">{fmt.dateLong(next.start)}</p>
              <p>
                {fmt.time(next.start)} · {next.counsellorName}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-slate-600 dark:text-slate-300">{t('profile.noUpcoming')}</p>
          )}
          <ButtonLink to="/me/appointments" variant="secondary" size="sm" className="mt-4">
            {t('nav.myAppointments')}
          </ButtonLink>
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold">{t('profile.personal')}</h2>
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault()
              if (draft.phone && !/^0\d{9}$/.test(draft.phone)) return toast(t('errors.invalidPhone'), 'error')
              setBusy(true)
              try {
                profile.setData(
                  await beneficiaryApi.updateProfile({
                    fullName: draft.fullName,
                    preferredName: draft.preferredName,
                    phone: draft.phone,
                    email: draft.email,
                    districtId: draft.districtId,
                    counsellingLanguage: draft.counsellingLanguage,
                  }),
                )
                toast(t('profile.updated'), 'success')
              } catch (err) {
                apiError.show(err)
              } finally {
                setBusy(false)
              }
            }}
          >
            <Input label={t('auth.fullName')} required value={draft.fullName ?? ''} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} autoComplete="name" />
            <Input label={t('profile.preferredName')} value={draft.preferredName ?? ''} onChange={(e) => setDraft({ ...draft, preferredName: e.target.value })} autoComplete="nickname" />
            <Input label={t('profile.phone')} type="tel" inputMode="tel" value={draft.phone ?? ''} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} autoComplete="tel" />
            <Input label={t('auth.email')} type="email" value={draft.email ?? ''} onChange={(e) => setDraft({ ...draft, email: e.target.value })} autoComplete="email" />
            <Select label={t('auth.district')} value={draft.districtId ?? ''} onChange={(e) => setDraft({ ...draft, districtId: e.target.value })} placeholder="—" options={districtOptions} />
            <Select
              label={t('profile.counsellingLanguage')}
              value={draft.counsellingLanguage ?? 'si'}
              onChange={(e) => setDraft({ ...draft, counsellingLanguage: e.target.value as Beneficiary['counsellingLanguage'] })}
              options={(['si', 'ta', 'en', 'sign'] as const).map((l) => ({ value: l, label: t(`lang.${l}`) }))}
            />
            <div className="sm:col-span-2">
              <Button type="submit" loading={busy}>
                {t('common.save')}
              </Button>
            </div>
          </form>
          {b.guardianConsent?.consentGiven && (
            <p className="mt-4 text-sm">
              <Badge tone="info">{t('profile.guardianOnFile', { name: b.guardianConsent.guardianName })}</Badge>
            </p>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ClipboardCheck aria-hidden className="size-5" /> {t('assess.historyTitle')}
        </h2>
        <div className="mt-4">
          <DataTable
            caption={t('assess.historyTitle')}
            rows={history.data ?? []}
            rowKey={(r) => r.id}
            columns={[
              { key: 'date', header: t('common.date'), render: (r) => fmt.date(r.completedAt), primary: true },
              { key: 'tool', header: t('assess.title'), render: (r) => t(`assess.${r.tool}`) },
              { key: 'band', header: t('assess.resultTitle'), render: (r) => t(`assess.bands.${r.bandKey}`) },
              { key: 'score', header: '#', render: (r) => r.score },
            ]}
          />
        </div>
      </Card>
    </>
  )
}
