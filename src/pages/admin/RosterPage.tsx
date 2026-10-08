import { addDays, format, parseISO } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Badge, Card, PageHeader, Spinner, cn } from '../../components/ui'
import { weekStartOf } from '../../domain/alerts'
import { useApiError } from '../../hooks/useApiError'
import { useAsync } from '../../hooks/useAsync'
import { useFormat } from '../../hooks/useFormat'
import { adminApi } from '../../services/api'
import { useUi } from '../../store/ui'

/** Weekly rotating Emergency Officer roster with future designations (FR-052, FR-083). */
export default function RosterPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const { data, loading, reload } = useAsync(() => adminApi.roster(), [])
  if (loading || !data) return <Spinner label={t('common.loading')} />

  const thisWeek = weekStartOf(new Date())
  const weeks = Array.from({ length: 10 }, (_, i) => format(addDays(parseISO(thisWeek), (i - 1) * 7), 'yyyy-MM-dd'))
  const nameOf = (id?: string) => data.officers.find((o) => o.id === id)?.name ?? '—'

  const save = async (weekStart: string, officerUserId: string, backupUserId?: string) => {
    try {
      await adminApi.setRoster(weekStart, { officerUserId, backupUserId: backupUserId || undefined })
      toast(t('admin.rosterSaved'), 'success')
      await reload()
    } catch (e) {
      apiError.show(e)
    }
  }

  return (
    <>
      <PageHeader title={t('admin.rosterTitle')} lead={t('admin.rosterLead')} />
      <ul className="space-y-2">
        {weeks.map((w) => {
          const entry = data.roster.find((r) => r.weekStart === w)
          const current = w === thisWeek
          const past = w < thisWeek
          return (
            <li key={w} className={cn('grid gap-3 rounded-xl border bg-white p-4 sm:grid-cols-[12rem_1fr_1fr] sm:items-end dark:bg-slate-900', current ? 'border-brand-500 ring-2 ring-brand-500' : 'border-slate-200 dark:border-slate-700', past && 'opacity-70')}>
              <div>
                <p className="font-semibold">{t('admin.weekOf', { date: fmt.date(w) })}</p>
                {current && <Badge tone="brand">{t('admin.currentWeek')}</Badge>}
              </div>
              <div>
                <label htmlFor={`off-${w}`} className="mb-1 block text-sm font-medium">
                  {t('admin.officer')}
                </label>
                <select
                  id={`off-${w}`}
                  disabled={past}
                  value={entry?.officerUserId ?? ''}
                  onChange={(e) => e.target.value && save(w, e.target.value, entry?.backupUserId)}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900"
                >
                  <option value="">—</option>
                  {data.officers.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`bak-${w}`} className="mb-1 block text-sm font-medium">
                  {t('admin.backup')}
                </label>
                <select
                  id={`bak-${w}`}
                  disabled={past || !entry}
                  value={entry?.backupUserId ?? ''}
                  onChange={(e) => entry && save(w, entry.officerUserId, e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 dark:border-slate-600 dark:bg-slate-900"
                >
                  <option value="">—</option>
                  {data.officers
                    .filter((o) => o.id !== entry?.officerUserId)
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                </select>
              </div>
            </li>
          )
        })}
      </ul>
      <Card className="mt-6">
        <h2 className="text-lg font-semibold">{t('admin.handovers')}</h2>
        {data.handovers.length === 0 ? (
          <p className="mt-2 text-slate-600 dark:text-slate-400">{t('common.noResults')}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-700">
            {data.handovers.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  {fmt.dateTime(h.at)} — {t('admin.handoverRow', { to: nameOf(h.toUserId), count: h.openAlertIds.length })}
                </span>
                <Badge tone={h.acknowledgedAt ? 'success' : 'warning'}>{h.acknowledgedAt ? t('admin.acknowledged') : t('admin.notAcknowledged')}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
