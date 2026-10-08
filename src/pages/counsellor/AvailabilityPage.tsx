import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, Checkbox, Input, PageHeader, Select, Spinner } from '../../components/ui'
import type { AvailabilityPattern } from '../../domain/slots'
import { useApiError } from '../../hooks/useApiError'
import { useAsync } from '../../hooks/useAsync'
import { useFormat } from '../../hooks/useFormat'
import { counsellorApi } from '../../services/api'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import type { SessionMode } from '../../types'

const MODES: SessionMode[] = ['video', 'audio', 'chat']

export default function AvailabilityPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const maxMin = useSettings((s) => s.settings.maxSessionDurationMin)
  const { data, loading, reload } = useAsync(() => counsellorApi.availability(), [])
  const [pattern, setPattern] = useState<AvailabilityPattern[]>([])
  const [oneOff, setOneOff] = useState({ start: '', durationMin: 60 })

  useEffect(() => {
    if (data) setPattern(data.availability.pattern)
  }, [data])

  if (loading && !data) return <Spinner label={t('common.loading')} />
  const update = (i: number, patch: Partial<AvailabilityPattern>) => setPattern((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  return (
    <>
      <PageHeader title={t('portal.availabilityTitle')} lead={t('portal.availabilityLead')} />
      <Card>
        <h2 className="text-lg font-semibold">{t('portal.weeklyPattern')}</h2>
        <ul className="mt-4 space-y-3">
          {pattern
            .map((p, i) => ({ p, i }))
            .sort((a, b) => a.p.weekday - b.p.weekday || a.p.time.localeCompare(b.p.time))
            .map(({ p, i }) => (
              <li key={i} className="grid items-end gap-3 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_8rem_8rem_auto_auto] dark:border-slate-700">
                <Select
                  label={t('portal.weekday')}
                  value={String(p.weekday)}
                  onChange={(e) => update(i, { weekday: Number(e.target.value) })}
                  options={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ value: String(d), label: t(`portal.weekdays.${d}`) }))}
                />
                <Input label={t('portal.start')} type="time" value={p.time} onChange={(e) => update(i, { time: e.target.value })} />
                <Input label={t('portal.duration')} type="number" min={15} max={maxMin} step={15} value={p.durationMin} onChange={(e) => update(i, { durationMin: Math.min(maxMin, Number(e.target.value)) })} />
                <fieldset className="flex flex-wrap gap-3 pb-2">
                  <legend className="sr-only">{t('portal.modes')}</legend>
                  {MODES.map((m) => (
                    <Checkbox
                      key={m}
                      label={t(`booking.modes.${m}`)}
                      checked={p.modes.includes(m)}
                      onChange={(e) => update(i, { modes: e.target.checked ? [...p.modes, m] : p.modes.filter((x) => x !== m) })}
                    />
                  ))}
                </fieldset>
                <Button variant="ghost" aria-label={t('common.delete')} onClick={() => setPattern((list) => list.filter((_, j) => j !== i))}>
                  <Trash2 aria-hidden className="size-5" />
                </Button>
              </li>
            ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" icon={<Plus aria-hidden className="size-4" />} onClick={() => setPattern((p) => [...p, { weekday: 1, time: '09:00', durationMin: Math.min(60, maxMin), modes: ['video', 'audio'] }])}>
            {t('portal.addWeekly')}
          </Button>
          <Button
            onClick={async () => {
              try {
                await counsellorApi.savePattern(pattern.filter((p) => p.modes.length))
                toast(t('common.saved'), 'success')
                await reload()
              } catch (e) {
                apiError.show(e)
              }
            }}
          >
            {t('portal.savePattern')}
          </Button>
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold">{t('portal.oneOff')}</h2>
        <form
          className="mt-4 grid items-end gap-3 sm:grid-cols-[1fr_10rem_auto]"
          onSubmit={async (e) => {
            e.preventDefault()
            if (!oneOff.start) return
            try {
              await counsellorApi.addSlot(new Date(oneOff.start).toISOString(), oneOff.durationMin, ['video', 'audio', 'chat'])
              toast(t('common.saved'), 'success')
              setOneOff({ start: '', durationMin: 60 })
              await reload()
            } catch (err) {
              apiError.show(err)
            }
          }}
        >
          <Input label={t('portal.start')} type="datetime-local" required value={oneOff.start} onChange={(e) => setOneOff({ ...oneOff, start: e.target.value })} />
          <Input label={t('portal.duration')} type="number" min={15} max={maxMin} step={15} value={oneOff.durationMin} onChange={(e) => setOneOff({ ...oneOff, durationMin: Math.min(maxMin, Number(e.target.value)) })} />
          <Button type="submit">{t('common.add')}</Button>
        </form>
      </Card>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold">{t('portal.upcomingSlots')}</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(data?.slots ?? []).map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
              <span className="text-sm">
                <span className="block font-semibold">{fmt.dayShort(s.start)}</span>
                {fmt.time(s.start)} · {t('common.minutes', { count: s.durationMin })}
              </span>
              {s.appointmentId ? (
                <Badge tone="brand">{t('portal.booked')}</Badge>
              ) : (
                <Button
                  size="sm"
                  variant={s.blocked ? 'primary' : 'secondary'}
                  aria-label={`${s.blocked ? t('portal.unblock') : t('portal.block')} ${fmt.dayShort(s.start)} ${fmt.time(s.start)}`}
                  onClick={async () => {
                    try {
                      await counsellorApi.blockSlot(s.id, !s.blocked)
                      await reload()
                    } catch (e) {
                      apiError.show(e)
                    }
                  }}
                >
                  {s.blocked ? t('portal.unblock') : t('portal.block')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}
