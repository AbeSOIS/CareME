import { useCallback, useEffect, useState } from 'react'
import { Megaphone, RefreshCw, Siren, User, UserCog, Users, UsersRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { BarChart } from '../../components/charts/BarChart'
import { TrendChart } from '../../components/charts/TrendChart'
import { KpiTile } from '../../components/feature/KpiTile'
import { Button, Card, Input, PageHeader, Select, Spinner } from '../../components/ui'
import { AWARENESS_CATEGORIES, SESSION_CATEGORIES } from '../../services/handlers/reports'
import { useApiError } from '../../hooks/useApiError'
import { useFormat } from '../../hooks/useFormat'
import { useLookups } from '../../hooks/useLookups'
import { reportsApi, type DashboardData, type StatQuery } from '../../services/api'
import { useSettings } from '../../store/settings'

const AGE_GROUPS = ['under18', '18-25', '26-35', '36-50', '51-65', 'over65']

/** Analytics dashboard (REP-007): auto-refresh at the configured interval (≤15 min), on-demand refresh, last-refreshed time. */
export default function DashboardPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const apiError = useApiError()
  const { districtOptions, districtName, dsName } = useLookups()
  const refreshMin = useSettings((s) => s.settings.dashboardRefreshMin)
  const [filters, setFilters] = useState<StatQuery>({ districtId: 'kalutara', from: '2026-01', to: '2026-12' })
  const [data, setData] = useState<DashboardData | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      setData(await reportsApi.dashboard(filters))
    } catch (e) {
      apiError.show(e)
    } finally {
      setRefreshing(false)
    }
  }, [filters, apiError])

  useEffect(() => {
    void refresh()
    const id = setInterval(() => void refresh(), Math.min(refreshMin, 15) * 60_000)
    return () => clearInterval(id)
  }, [refresh, refreshMin])

  const divisionLabel = (id: string) => (data?.divisionLevel === 'ds' ? dsName(id) : districtName(id))
  const set = (patch: StatQuery) => setFilters((f) => ({ ...f, ...patch }))

  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        lead={t('dashboard.lead')}
        actions={
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <Button onClick={refresh} loading={refreshing} icon={<RefreshCw aria-hidden className="size-4" />}>
              {t('dashboard.refreshNow')}
            </Button>
            <p className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
              {data && t('dashboard.lastRefreshed', { time: fmt.dateTime(data.refreshedAt) })}
            </p>
            <p className="text-xs text-slate-500">{t('dashboard.autoRefresh', { minutes: Math.min(refreshMin, 15) })}</p>
          </div>
        }
      />

      <Card className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Select label={t('auth.district')} value={filters.districtId ?? ''} onChange={(e) => set({ districtId: e.target.value || undefined })} placeholder={t('dashboard.allDistricts')} options={districtOptions} />
          <Select
            label={t('auth.gender')}
            value={filters.gender ?? ''}
            onChange={(e) => set({ gender: (e.target.value || undefined) as StatQuery['gender'] })}
            placeholder={t('dashboard.allGenders')}
            options={(['female', 'male'] as const).map((g) => ({ value: g, label: t(`gender.${g}`) }))}
          />
          <Select label={t('dashboard.ageGroup')} value={filters.ageGroup ?? ''} onChange={(e) => set({ ageGroup: e.target.value || undefined })} placeholder={t('dashboard.allAges')} options={AGE_GROUPS.map((a) => ({ value: a, label: t(`dashboard.ageGroups.${a}`) }))} />
          <Input label={t('common.from')} type="month" value={filters.from ?? ''} onChange={(e) => set({ from: e.target.value || undefined })} />
          <Input label={t('common.to')} type="month" value={filters.to ?? ''} onChange={(e) => set({ to: e.target.value || undefined })} />
        </div>
      </Card>

      {!data ? (
        <Spinner label={t('common.loading')} />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <KpiTile label={t('dashboard.kpi.individual')} value={fmt.number(data.kpis.individual)} icon={User} />
            <KpiTile label={t('dashboard.kpi.group')} value={fmt.number(data.kpis.group)} icon={UsersRound} />
            <KpiTile label={t('dashboard.kpi.groupParticipants')} value={fmt.number(data.kpis.groupParticipants)} icon={Users} />
            <KpiTile label={t('dashboard.kpi.awareness')} value={fmt.number(data.kpis.awareness)} icon={Megaphone} />
            <KpiTile label={t('dashboard.kpi.openAlerts')} value={fmt.number(data.kpis.openAlerts)} icon={Siren} tone={data.kpis.openAlerts ? 'alert' : 'default'} />
            <KpiTile label={t('dashboard.kpi.activeCounsellors')} value={fmt.number(data.kpis.activeCounsellors)} icon={UserCog} />
          </div>

          <BarChart
            title={data.divisionLevel === 'ds' ? t('dashboard.byDivision') : t('dashboard.byDistrict')}
            data={data.byDivision.map((d) => ({ ...d, name: divisionLabel(d.id) }))}
            xKey="name"
            xLabel={t('reports.division')}
            series={SESSION_CATEGORIES.map((c) => ({ key: c, label: t(`category.${c}`) }))}
            stacked
            height={340}
          />

          <TrendChart
            title={t('dashboard.byMonth')}
            data={data.byMonth.map((m) => ({ ...m, label: fmt.month(m.month) }))}
            xKey="label"
            xLabel={t('reports.month')}
            series={[
              { key: 'individual', label: t('dashboard.individual') },
              { key: 'group', label: t('dashboard.group') },
              { key: 'awareness', label: t('dashboard.awareness') },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <BarChart
              title={t('dashboard.byGender')}
              data={(['female', 'male'] as const).map((g) => ({ name: t(`gender.${g}`), count: data.byGender[g] ?? 0 }))}
              xKey="name"
              xLabel={t('auth.gender')}
              series={[{ key: 'count', label: t('dashboard.kpi.individual') }]}
              height={220}
            />
            <BarChart
              title={t('dashboard.byAge')}
              data={AGE_GROUPS.map((a) => ({ name: t(`dashboard.ageGroups.${a}`), count: data.byAgeGroup[a] ?? 0 }))}
              xKey="name"
              xLabel={t('dashboard.ageGroup')}
              series={[{ key: 'count', label: t('dashboard.kpi.individual') }]}
              height={220}
            />
          </div>

          <BarChart
            title={t('dashboard.awarenessByCategory')}
            data={AWARENESS_CATEGORIES.map((c) => ({ name: t(`category.${c}`), count: data.awarenessByCategory[c] ?? 0 })).filter((r) => r.count > 0)}
            xKey="name"
            xLabel={t('case.category')}
            series={[{ key: 'count', label: t('dashboard.kpi.awareness') }]}
            layout="vertical"
            height={300}
          />
        </div>
      )}
    </>
  )
}
