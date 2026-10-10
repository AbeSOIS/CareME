import { useEffect } from 'react'
import { isSameDay, parseISO } from 'date-fns'
import { CalendarDays, FolderHeart, Inbox, Share2, Siren, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
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
  /*
   * Risk-flagged clients come first. Derived from the alerts already loaded here:
   * an open alert carries the beneficiaryId, so no new field or request is needed.
   */
  const flaggedIds = new Set(openAlerts.map((a) => a.beneficiaryId).filter(Boolean))
  const flagged = cases.filter((c) => flaggedIds.has(c.beneficiaryId))

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
      {flagged.length > 0 && (
        <Card className="mt-6 border-red-200 dark:border-red-900">
          <h2 className="flex items-center gap-2 text-h3 text-red-800 dark:text-red-300">
            <Siren aria-hidden className="size-5 shrink-0" />
            {t('portal.riskFlagged')}
          </h2>
          <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-700">
            {flagged.map((c) => (
              <li key={c.caseId} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  <Link to={`/counsellor/cases/${c.caseId}`} className="text-body font-semibold text-brand-800 hover:underline dark:text-brand-200">
                    {c.name}
                  </Link>{' '}
                  <span className="font-mono text-body-sm text-slate-600 dark:text-slate-300">{c.clientCode}</span>
                </span>
                <Badge tone="danger">
                  <Siren aria-hidden className="size-3.5 shrink-0" />
                  {t('portal.riskAlertOpen')}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="text-h3">{t('portal.today')}</h2>
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
                    {fmt.time(a.start)} · {a.clientName} <span className="font-mono text-body-sm text-slate-600 dark:text-slate-300">{a.clientCode}</span>
                  </p>
                  <p className="text-body-sm text-slate-600 dark:text-slate-300">
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
