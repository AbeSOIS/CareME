import { useEffect } from 'react'
import { isSameDay, parseISO } from 'date-fns'
import { CalendarDays, FolderHeart, Inbox, Share2, Siren, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppointmentStatusBadge } from '../../components/feature/AppointmentStatusBadge'
import { HandoverBanner } from '../../components/feature/HandoverBanner'
import { KpiTile } from '../../components/feature/KpiTile'
import { Badge, ButtonLink, Card, EmptyState, PageHeader } from '../../components/ui'
import { canJoin } from '../../domain/bookingRules'
import { useAsync } from '../../hooks/useAsync'
import { useFormat } from '../../hooks/useFormat'
import { useNow } from '../../hooks/useNow'
import { alertsApi, referralsApi } from '../../services/api'
import { useAppointments } from '../../store/appointments'
import { useAuth } from '../../store/auth'
import { useCases } from '../../store/cases'

export default function CounsellorHome() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const now = useNow(30_000)
  const user = useAuth((s) => s.session?.user)
  const isOfficer = useAuth((s) => s.session?.effectiveRoles.includes('emergencyOfficer'))
  const { counsellor: apts, loadCounsellor } = useAppointments()
  const { list: cases, loadList } = useCases()
  const referrals = useAsync(() => referralsApi.list(), [])
  const alerts = useAsync(() => alertsApi.list(), [])

  useEffect(() => {
    void loadCounsellor()
    void loadList()
  }, [loadCounsellor, loadList])

  const today = apts.filter((a) => isSameDay(parseISO(a.start), now) && ['confirmed', 'requested', 'completed', 'noShow'].includes(a.status))
  const pending = apts.filter((a) => a.status === 'requested')
  const openAlerts = (alerts.data ?? []).filter((a) => a.status !== 'closed')

  return (
    <>
      <PageHeader title={t('portal.greeting', { name: user?.displayName ?? '' })} lead={isOfficer ? <Badge tone="danger">{t('portal.onDuty')}</Badge> : undefined} />
      <HandoverBanner />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile label={t('portal.today')} value={today.length} icon={CalendarDays} to="/counsellor/appointments" />
        <KpiTile label={t('portal.pendingRequests')} value={pending.length} icon={Inbox} to="/counsellor/appointments" />
        <KpiTile label={t('portal.openCases')} value={cases.filter((c) => c.status === 'open').length} icon={FolderHeart} to="/counsellor/cases" />
        <KpiTile label={t('portal.openReferrals')} value={(referrals.data ?? []).filter((r) => r.direction === 'inbound' && ['received', 'underReview'].includes(r.status)).length} icon={Share2} to="/counsellor/referrals" />
        {isOfficer && <KpiTile label={t('portal.openAlerts')} value={openAlerts.length} icon={Siren} tone="alert" to="/counsellor/alerts" />}
      </div>
      <Card className="mt-6">
        <h2 className="text-lg font-semibold">{t('portal.today')}</h2>
        {today.length === 0 ? (
          <div className="mt-3">
            <EmptyState>{t('portal.noToday')}</EmptyState>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-700">
            {today.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">
                    {fmt.time(a.start)} · {a.clientName} <span className="font-mono text-sm text-slate-500">{a.clientCode}</span>
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t(`booking.modes.${a.mode}`)} · {t(`lang.${a.language}`)} · {t('portal.session')} {a.sessionNumber}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <AppointmentStatusBadge status={a.status} />
                  {canJoin(a, now) && (
                    <ButtonLink to={`/session/${a.id}`} size="sm" icon={<Video aria-hidden className="size-4" />}>
                      {t('portal.startSession')}
                    </ButtonLink>
                  )}
                  {a.caseId && (
                    <ButtonLink to={`/counsellor/cases/${a.caseId}`} size="sm" variant="secondary">
                      {t('portal.openCase')}
                    </ButtonLink>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
