import { useState } from 'react'
import { parseISO } from 'date-fns'
import { Plus, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, Checkbox, EmptyState, Input, Modal, PageHeader, Select, Spinner } from '../../components/ui'
import { useApiError } from '../../hooks/useApiError'
import { useAsync } from '../../hooks/useAsync'
import { useFormat } from '../../hooks/useFormat'
import { useLookups } from '../../hooks/useLookups'
import { adminApi, counsellorApi, referralsApi } from '../../services/api'
import { useAuth } from '../../store/auth'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import type { BeneficiaryMatch, GroupSessionView, SessionCategory, SessionMode } from '../../types'

const CATEGORIES: SessionCategory[] = ['mentalDisorder', 'family', 'relationship', 'education', 'economic', 'drugRelated']

/** Group sessions (FR-037–041): schedule with capacity, enrol up to capacity, record attendance. Shared by admin and counsellor portals. */
export default function GroupsPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const { dsOptions } = useLookups()
  const settings = useSettings((s) => s.settings)
  const isAdmin = useAuth((s) => s.session?.effectiveRoles.includes('admin'))
  const myCounsellorId = useAuth((s) => s.session?.user.counsellorId)
  const groups = useAsync(() => adminApi.groups(), [])
  const directory = useAsync(() => (isAdmin ? adminApi.counsellors() : counsellorApi.directory()), [isAdmin])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ title: '', counsellorId: myCounsellorId ?? '', start: '', durationMin: 60, mode: 'video' as SessionMode, capacity: settings.groupDefaultCapacity, dsDivisionId: '', category: 'mentalDisorder' as SessionCategory })
  const [enrolFor, setEnrolFor] = useState<GroupSessionView | null>(null)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<BeneficiaryMatch[]>([])

  const replace = (g: GroupSessionView) => {
    groups.setData((list) => (list ?? []).map((x) => (x.id === g.id ? g : x)))
    if (enrolFor?.id === g.id) setEnrolFor(g)
  }
  const op = async (g: GroupSessionView, body: Parameters<typeof adminApi.updateGroup>[1]) => {
    try {
      replace(await adminApi.updateGroup(g.id, body))
    } catch (e) {
      apiError.show(e)
    }
  }

  return (
    <>
      <PageHeader
        title={t('admin.groupsTitle')}
        lead={t('admin.groupsLead')}
        actions={
          <Button icon={<Plus aria-hidden className="size-5" />} onClick={() => setCreating(true)}>
            {t('admin.newGroup')}
          </Button>
        }
      />
      {groups.loading ? (
        <Spinner label={t('common.loading')} />
      ) : !groups.data?.length ? (
        <EmptyState>{t('common.noResults')}</EmptyState>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {groups.data.map((g) => {
            const started = parseISO(g.start) <= new Date()
            const full = g.enrolledBeneficiaryIds.length >= g.capacity
            return (
              <Card as="li" key={g.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-h3">{g.title}</h2>
                    <p className="text-body-sm text-slate-600 dark:text-slate-400">
                      {fmt.dateLong(g.start)} · {fmt.time(g.start)} · {t(`booking.modes.${g.mode}`)} · {g.counsellorName}
                    </p>
                  </div>
                  <Badge tone={full ? 'warning' : 'brand'}>{full ? t('admin.full') : t('admin.enrolled', { count: g.enrolledBeneficiaryIds.length, capacity: g.capacity })}</Badge>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden>
                  <div className="h-full bg-brand-600" style={{ width: `${Math.min(100, (g.enrolledBeneficiaryIds.length / g.capacity) * 100)}%` }} />
                </div>
                <Badge>{t(`category.${g.category}`)}</Badge>
                <ul className="divide-y divide-slate-100 text-body-sm dark:divide-slate-800">
                  {g.enrolled.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
                      <span>
                        <span className="font-mono text-caption">{p.clientCode}</span> {p.name}
                      </span>
                      {started ? (
                        <Checkbox label={t('admin.attended')} checked={g.attendance[p.id] ?? false} onChange={(e) => op(g, { attendance: { beneficiaryId: p.id, attended: e.target.checked } })} />
                      ) : (
                        <Button size="sm" variant="ghost" aria-label={`${t('admin.remove')} ${p.name}`} onClick={() => op(g, { remove: p.id })}>
                          <X aria-hidden className="size-4" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
                {!started && (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={full}
                    onClick={() => {
                      setEnrolFor(g)
                      setQuery('')
                      setMatches([])
                    }}
                  >
                    {t('admin.enrol')}
                  </Button>
                )}
              </Card>
            )
          })}
        </ul>
      )}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        size="lg"
        title={t('admin.newGroup')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreating(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={!form.title || !form.start || !form.counsellorId}
              onClick={async () => {
                try {
                  const g = await adminApi.createGroup({ ...form, start: new Date(form.start).toISOString(), dsDivisionId: form.dsDivisionId || undefined })
                  groups.setData((list) => [g, ...(list ?? [])])
                  setCreating(false)
                  toast(t('admin.groupSaved'), 'success')
                } catch (e) {
                  apiError.show(e)
                }
              }}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('admin.groupTitle')} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} wrapperClassName="sm:col-span-2" />
          <Select
            label={t('reports.counsellor')}
            required
            value={form.counsellorId}
            onChange={(e) => setForm({ ...form, counsellorId: e.target.value })}
            placeholder="—"
            options={(directory.data ?? []).filter((c) => isAdmin || c.id === myCounsellorId).map((c) => ({ value: c.id, label: c.fullName }))}
          />
          <Input label={t('portal.start')} type="datetime-local" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
          <Input label={t('portal.duration')} type="number" min={15} max={settings.maxSessionDurationMin} value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })} />
          <Input
            label={t('admin.capacity')}
            hint={t('admin.capacityHint', { default: settings.groupDefaultCapacity, max: settings.groupMaxCapacity })}
            type="number"
            min={2}
            max={settings.groupMaxCapacity}
            required
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
          />
          <Select label={t('portal.mode')} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as SessionMode })} options={(['video', 'audio', 'chat', 'inPerson'] as const).map((m) => ({ value: m, label: t(`booking.modes.${m}`) }))} />
          <Select label={t('case.category')} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as SessionCategory })} options={CATEGORIES.map((c) => ({ value: c, label: t(`category.${c}`) }))} />
          <Select label={t('referrals.receivingDs')} value={form.dsDivisionId} onChange={(e) => setForm({ ...form, dsDivisionId: e.target.value })} placeholder="—" options={dsOptions('kalutara')} />
        </div>
      </Modal>

      <Modal open={Boolean(enrolFor)} onClose={() => setEnrolFor(null)} title={t('admin.enrol')} description={enrolFor ? t('admin.enrolled', { count: enrolFor.enrolledBeneficiaryIds.length, capacity: enrolFor.capacity }) : undefined}>
        <form
          className="flex items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            try {
              setMatches(await referralsApi.searchBeneficiaries({ name: query }))
            } catch (err) {
              apiError.show(err)
            }
          }}
        >
          <Input label={t('admin.enrolSearch')} value={query} onChange={(e) => setQuery(e.target.value)} wrapperClassName="flex-1" />
          <Button type="submit" aria-label={t('common.search')}>
            <Search aria-hidden className="size-5" />
          </Button>
        </form>
        <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
          {matches.map((m) => {
            const already = enrolFor?.enrolledBeneficiaryIds.includes(m.id)
            return (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-mono text-caption">{m.clientCode}</span> {m.name}
                </span>
                <Button size="sm" disabled={already || (enrolFor?.enrolledBeneficiaryIds.length ?? 0) >= (enrolFor?.capacity ?? 0)} onClick={() => enrolFor && op(enrolFor, { enrol: m.id })}>
                  {already ? '✓' : t('common.add')}
                </Button>
              </li>
            )
          })}
        </ul>
      </Modal>
    </>
  )
}
