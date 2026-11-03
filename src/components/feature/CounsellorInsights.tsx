import { useMemo } from 'react'
import { addDays, differenceInCalendarDays, isSameDay, parseISO, startOfWeek } from 'date-fns'
import { Activity, CheckCircle2, Clock, TrendingUp, UserCheck, UserX, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LOCALE_TAG } from '../../i18n'
import { useUi } from '../../store/ui'
import type { Appointment, ClientSummary } from '../../types'
import { BarChart } from '../charts/BarChart'
import { TrendChart } from '../charts/TrendChart'
import { Card } from '../ui'
import { KpiTile } from './KpiTile'
import { AppointmentStatusBadge } from './AppointmentStatusBadge'

interface Props {
  appointments: Appointment[]
  cases: ClientSummary[]
  now: Date
  formatTime: (iso: string) => string
}

const pct = (n: number, d: number) => (d === 0 ? '0%' : `${Math.round((n / d) * 100)}%`)

/** Metrics, charts and a short upcoming list derived from the counsellor's own appointments and cases. */
export function CounsellorInsights({ appointments, cases, now, formatTime }: Props) {
  const { t } = useTranslation()
  const lang = useUi((s) => s.language)

  const m = useMemo(() => {
    const completed = appointments.filter((a) => a.status === 'completed')
    const noShow = appointments.filter((a) => a.status === 'noShow')
    const held = completed.length + noShow.length
    const minutes = completed.reduce((sum, a) => sum + a.durationMin, 0)
    const activeClients = cases.filter((c) => c.status === 'open')
    const avg = cases.length ? cases.reduce((s, c) => s + c.sessions, 0) / cases.length : 0

    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const dayFmt = new Intl.DateTimeFormat(LOCALE_TAG[lang], { weekday: 'short' })
    const week = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(weekStart, i)
      const todays = appointments.filter((a) => isSameDay(parseISO(a.start), day) && !['rejected', 'cancelled', 'lateCancelled'].includes(a.status))
      return {
        day: dayFmt.format(day),
        total: todays.length,
        completed: todays.filter((a) => a.status === 'completed').length,
      }
    })

    const statusKeys = ['requested', 'confirmed', 'completed', 'noShow', 'cancelled', 'lateCancelled', 'rejected'] as const
    const status = statusKeys.map((k) => ({ label: t(`appointments.status.${k}`), count: appointments.filter((a) => a.status === k).length })).filter((r) => r.count > 0)

    const modes = (['video', 'audio', 'chat', 'inPerson'] as const)
      .map((k) => ({ type: t(`booking.modes.${k}`), count: appointments.filter((a) => a.mode === k).length }))
      .filter((r) => r.count > 0)

    const bands = [
      { range: '0–1', min: 0, max: 1 },
      { range: '2–3', min: 2, max: 3 },
      { range: '4–5', min: 4, max: 5 },
      { range: '6–8', min: 6, max: 99 },
    ].map((b) => ({ range: b.range, clients: cases.filter((c) => c.sessions >= b.min && c.sessions <= b.max).length }))

    const upcoming = appointments
      .filter((a) => ['confirmed', 'requested'].includes(a.status) && parseISO(a.start) > now)
      .sort((a, b) => a.start.localeCompare(b.start))
      .slice(0, 5)

    return { completed: completed.length, held, noShow: noShow.length, minutes, activeClients: activeClients.length, avg, week, status, modes, bands, upcoming }
  }, [appointments, cases, now, lang, t])

  return (
    <section aria-labelledby="insights-h" className="mt-6">
      <h2 id="insights-h" className="mb-3 text-h3">
        {t('portal.dash.insights')}
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <KpiTile label={t('portal.dash.kpiTotal')} value={appointments.length} icon={Activity} />
        <KpiTile label={t('portal.dash.kpiCompletion')} value={pct(m.completed, m.held)} icon={CheckCircle2} hint={`${m.completed}/${m.held}`} />
        <KpiTile label={t('portal.dash.kpiNoShow')} value={pct(m.noShow, m.held)} icon={UserX} tone={m.held > 0 && m.noShow / m.held > 0.2 ? 'alert' : 'default'} />
        <KpiTile label={t('portal.dash.kpiClients')} value={m.activeClients} icon={Users} />
        <KpiTile label={t('portal.dash.kpiAvg')} value={m.avg.toFixed(1)} icon={TrendingUp} />
        <KpiTile label={t('portal.dash.kpiHours')} value={(m.minutes / 60).toFixed(1)} icon={Clock} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TrendChart
          title={t('portal.dash.chartWeek')}
          data={m.week}
          xKey="day"
          xLabel={t('portal.dash.colDay')}
          series={[
            { key: 'total', label: t('portal.dash.colSessions') },
            { key: 'completed', label: t('appointments.status.completed') },
          ]}
        />
        <BarChart title={t('portal.dash.chartStatus')} data={m.status} xKey="label" xLabel={t('portal.dash.colStatus')} series={[{ key: 'count', label: t('portal.dash.colCount') }]} />
        <BarChart title={t('portal.dash.chartMode')} data={m.modes} xKey="type" xLabel={t('portal.dash.colType')} series={[{ key: 'count', label: t('portal.dash.colCount') }]} layout="vertical" height={220} />
        <BarChart title={t('portal.dash.chartCases')} data={m.bands} xKey="range" xLabel={t('portal.dash.colRange')} series={[{ key: 'clients', label: t('portal.dash.colClients') }]} height={220} />
      </div>

      <Card className="mt-4">
        <h3 className="flex items-center gap-2 text-h3">
          <UserCheck aria-hidden className="size-5 shrink-0 text-brand-700 dark:text-brand-300" />
          {t('portal.dash.next')}
        </h3>
        {m.upcoming.length === 0 ? (
          <p className="mt-3 text-body-sm text-slate-600 dark:text-slate-300">{t('portal.dash.noNext')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-700">
            {m.upcoming.map((a) => {
              const days = differenceInCalendarDays(parseISO(a.start), now)
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <span className="text-body-sm">
                    <span className="font-semibold tabular-nums">{new Intl.DateTimeFormat(LOCALE_TAG[lang], { month: 'short', day: 'numeric' }).format(parseISO(a.start))}</span> · {formatTime(a.start)} · {t(`booking.modes.${a.mode}`)}
                    {days > 0 && <span className="text-slate-600 dark:text-slate-300"> (+{days})</span>}
                  </span>
                  <AppointmentStatusBadge status={a.status} />
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </section>
  )
}
