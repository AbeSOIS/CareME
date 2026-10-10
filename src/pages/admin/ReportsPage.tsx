import { useState } from 'react'
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, Callout, Card, DataTable, Input, PageHeader, Select, Spinner } from '../../components/ui'
import { KpiTile } from '../../components/feature/KpiTile'
import { useApiError } from '../../hooks/useApiError'
import { useFormat } from '../../hooks/useFormat'
import { useLookups } from '../../hooks/useLookups'
import { reportsApi, type ReportRow } from '../../services/api'
import { downloadCsv, toCsv } from '../../services/exportCsv'
import { SESSION_CATEGORIES } from '../../services/handlers/reports'
import { useUi } from '../../store/ui'

type ReportType = 'monthly' | 'operational' | 'management' | 'groups' | 'emergency'
const TYPES: ReportType[] = ['monthly', 'operational', 'management', 'groups', 'emergency']
const AGES = ['under18', '18-25', '26-35', '36-50', '51-65', 'over65']

interface Result {
  columns: Array<{ key: string; label: string }>
  rows: ReportRow[]
  summary?: Array<{ label: string; value: string }>
  note?: string
}

/** Reports (REP-001–006): generated from platform data, CSV export works; Excel/PDF are stubbed. */
export default function ReportsPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const { districtOptions, districtName, dsName } = useLookups()
  const [type, setType] = useState<ReportType>('monthly')
  const [month, setMonth] = useState('2026-03')
  const [districtId, setDistrictId] = useState('kalutara')
  const [from, setFrom] = useState('2026-01')
  const [to, setTo] = useState('2026-12')
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)

  const generate = async () => {
    setBusy(true)
    try {
      setResult(await build())
    } catch (e) {
      apiError.show(e)
    } finally {
      setBusy(false)
    }
  }

  async function build(): Promise<Result> {
    if (type === 'monthly') {
      const r = await reportsApi.monthly(month, districtId)
      return {
        columns: [
          { key: 'division', label: t('reports.division') },
          ...SESSION_CATEGORIES.map((c) => ({ key: c, label: t(`category.${c}`) })),
          { key: 'male', label: t('reports.male') },
          { key: 'female', label: t('reports.female') },
          { key: 'individualTotal', label: t('reports.total') },
          { key: 'groupSessions', label: t('reports.groupSessions') },
          { key: 'groupParticipants', label: t('reports.groupParticipants') },
          { key: 'awareness', label: t('reports.awareness') },
        ],
        rows: r.rows.map((x) => ({ ...x, division: dsName(String(x.division)) })),
        note: t('reports.deckNote'),
      }
    }
    if (type === 'management') {
      const r = await reportsApi.management({ from, to })
      return {
        columns: [
          { key: 'district', label: t('reports.district') },
          { key: 'total', label: t('reports.total') },
          { key: 'female', label: t('reports.female') },
          { key: 'male', label: t('reports.male') },
          ...AGES.map((a) => ({ key: a, label: t(`dashboard.ageGroups.${a}`) })),
        ],
        rows: r.rows.map((x) => ({ ...x, district: districtName(String(x.district)) })),
      }
    }
    if (type === 'operational') {
      const r = await reportsApi.operational({ from, to })
      const label = (m: string) => (m.startsWith('appointments.') ? `${t('reports.metrics.appointmentsTotal')}: ${t(`appointments.status.${m.split('.')[1]}`)}` : t(`reports.metrics.${m}`))
      return {
        columns: [
          { key: 'metric', label: t('reports.metric') },
          { key: 'value', label: t('reports.value') },
        ],
        rows: r.rows.map((x) => ({ ...x, metric: label(String(x.metric)) })),
      }
    }
    if (type === 'groups') {
      const r = await reportsApi.groups({ from, to })
      return {
        columns: [
          { key: 'date', label: t('common.date') },
          { key: 'title', label: t('reports.title_') },
          { key: 'counsellor', label: t('reports.counsellor') },
          { key: 'category', label: t('case.category') },
          { key: 'capacity', label: t('reports.capacity') },
          { key: 'enrolled', label: t('reports.enrolled') },
          { key: 'attended', label: t('reports.attended') },
          { key: 'attendanceRate', label: t('reports.attendanceRate') },
        ],
        rows: r.rows.map((x) => ({ ...x, category: t(`category.${x.category}`) })),
      }
    }
    const r = await reportsApi.emergency({ from, to })
    return {
      columns: [
        { key: 'raisedAt', label: t('reports.raisedAt') },
        { key: 'source', label: t('reports.source') },
        { key: 'client', label: t('reports.client') },
        { key: 'minutesToAcknowledge', label: t('reports.minutesToAck') },
        { key: 'escalations', label: t('reports.escalations') },
        { key: 'status', label: t('common.status') },
        { key: 'outcome', label: t('reports.outcome') },
      ],
      rows: r.rows.map((x) => ({
        ...x,
        raisedAt: fmt.dateTime(String(x.raisedAt)),
        source: t(`alerts.source.${x.source}`),
        status: t(`alerts.status.${x.status}`),
        outcome: x.outcome ? t(`alerts.outcomes.${x.outcome}`) : '',
      })),
      summary: [
        { label: t('reports.totalAlerts'), value: String(r.summary.total) },
        { label: t('reports.escalatedCount'), value: String(r.summary.escalated) },
        { label: t('reports.avgAck'), value: r.summary.avgAckMinutes === null ? '—' : t('common.minutes', { count: r.summary.avgAckMinutes }) },
      ],
      note: r.identityVisible ? undefined : t('reports.identityHidden'),
    }
  }

  const stub = (format: string) => toast(t('reports.stubbed', { format }), 'info')
  const usesMonth = type === 'monthly'

  return (
    <>
      <PageHeader title={t('reports.title')} lead={t('reports.lead')} />
      <Card className="mb-6">
        <form
          className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-5"
          onSubmit={(e) => {
            e.preventDefault()
            void generate()
          }}
        >
          <Select
            label={t('reports.type')}
            value={type}
            onChange={(e) => {
              setType(e.target.value as ReportType)
              setResult(null)
            }}
            options={TYPES.map((x) => ({ value: x, label: t(`reports.types.${x}`) }))}
            wrapperClassName="lg:col-span-2"
          />
          {usesMonth ? (
            <>
              <Input label={t('reports.month')} type="month" required value={month} onChange={(e) => setMonth(e.target.value)} />
              <Select label={t('auth.district')} value={districtId} onChange={(e) => setDistrictId(e.target.value)} options={districtOptions} />
            </>
          ) : (
            <>
              <Input label={t('common.from')} type="month" value={from} onChange={(e) => setFrom(e.target.value)} />
              <Input label={t('common.to')} type="month" value={to} onChange={(e) => setTo(e.target.value)} />
            </>
          )}
          <Button type="submit" loading={busy}>
            {t('reports.generate')}
          </Button>
        </form>
      </Card>

      {busy && !result && <Spinner label={t('common.loading')} />}
      {result && (
        <section aria-labelledby="report-title" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="report-title" className="text-h2">
                {t(`reports.types.${type}`)}
                {usesMonth && ` — ${fmt.month(month)} · ${districtName(districtId)}`}
              </h2>
              <p className="text-body-sm text-slate-600 dark:text-slate-400">{t('reports.rows', { count: result.rows.length })}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={<FileDown aria-hidden className="size-4" />}
                onClick={() => {
                  downloadCsv(`careme-${type}-${usesMonth ? month : `${from}_${to}`}.csv`, toCsv(result.columns, result.rows))
                  toast(t('reports.exported'), 'success')
                }}
              >
                {t('reports.exportCsv')}
              </Button>
              <Button variant="secondary" icon={<FileSpreadsheet aria-hidden className="size-4" />} onClick={() => stub('Excel')}>
                {t('reports.exportExcel')}
              </Button>
              <Button variant="secondary" icon={<FileText aria-hidden className="size-4" />} onClick={() => stub('PDF')}>
                {t('reports.exportPdf')}
              </Button>
            </div>
          </div>
          {result.summary && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {result.summary.map((s) => (
                <KpiTile key={s.label} label={s.label} value={s.value} />
              ))}
            </div>
          )}
          {result.note && <Callout tone="info">{result.note}</Callout>}
          <DataTable
            caption={t(`reports.types.${type}`)}
            rows={result.rows}
            rowKey={(r) => JSON.stringify(r)}
            columns={result.columns.map((c, i) => {
              const numeric = result.rows.some((r) => typeof r[c.key] === 'number')
              return {
                key: c.key,
                header: c.label,
                primary: i === 0,
                className: numeric ? 'text-right tabular-nums' : undefined,
                render: (r: ReportRow) => (r[c.key] === null ? '—' : String(r[c.key] ?? '')),
              }
            })}
          />
        </section>
      )}
    </>
  )
}
