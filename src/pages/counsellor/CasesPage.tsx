import { useEffect, useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, DataTable, Input, Modal, PageHeader, Select, Spinner } from '../../components/ui'
import { useApiError } from '../../hooks/useApiError'
import { useFormat } from '../../hooks/useFormat'
import { useLookups } from '../../hooks/useLookups'
import { counsellorApi } from '../../services/api'
import { useCases } from '../../store/cases'
import type { CounsellingLanguage, Gender } from '../../types'

export default function CasesPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const navigate = useNavigate()
  const apiError = useApiError()
  const { dsOptions } = useLookups()
  const { list, loading, loadList } = useCases()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ fullName: '', phone: '', dateOfBirth: '', gender: 'female' as Gender, dsDivisionId: '', counsellingLanguage: 'si' as CounsellingLanguage })

  useEffect(() => {
    void loadList()
  }, [loadList])
  const rows = useMemo(() => list.filter((c) => !q || `${c.name} ${c.clientCode}`.toLowerCase().includes(q.toLowerCase())), [list, q])

  return (
    <>
      <PageHeader
        title={t('portal.casesTitle')}
        actions={
          <Button icon={<UserPlus aria-hidden className="size-5" />} onClick={() => setOpen(true)}>
            {t('portal.newClient')}
          </Button>
        }
      />
      <Input label={t('common.search')} placeholder={t('portal.searchClients')} type="search" value={q} onChange={(e) => setQ(e.target.value)} wrapperClassName="mb-4 max-w-md" />
      {loading && !list.length ? (
        <Spinner label={t('common.loading')} />
      ) : (
        <DataTable
          caption={t('portal.casesTitle')}
          rows={rows}
          rowKey={(r) => r.caseId}
          columns={[
            {
              key: 'name',
              header: t('portal.client'),
              primary: true,
              render: (r) => (
                <Link to={`/counsellor/cases/${r.caseId}`} className="font-semibold text-brand-800 hover:underline dark:text-brand-200">
                  {r.name}
                </Link>
              ),
            },
            { key: 'code', header: t('profile.clientCode'), render: (r) => <span className="font-mono">{r.clientCode}</span> },
            { key: 'age', header: t('auth.dateOfBirth'), render: (r) => (r.age !== undefined ? t('case.age', { age: r.age }) : '—') },
            { key: 'cat', header: t('case.primaryCategory'), render: (r) => (r.primaryCategory ? t(`category.${r.primaryCategory}`) : '—') },
            { key: 'sessions', header: t('portal.sessions'), render: (r) => r.sessions },
            { key: 'opened', header: t('portal.opened'), render: (r) => fmt.date(r.openedAt) },
            {
              key: 'flags',
              header: t('common.status'),
              render: (r) => (
                <span className="flex flex-wrap justify-end gap-1 md:justify-start">
                  <Badge tone={r.status === 'open' ? 'success' : 'neutral'}>{r.status === 'open' ? t('common.open') : t('common.close')}</Badge>
                  {r.minor && <Badge tone="warning">{t('portal.minor')}</Badge>}
                  {r.pendingRegistration && <Badge tone="info">{t('portal.pendingRegistration')}</Badge>}
                </span>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('portal.newClient')}
        description={t('portal.newClientLead')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={form.fullName.trim().length < 2}
              onClick={async () => {
                try {
                  const created = await counsellorApi.createCase({ ...form, phone: form.phone || undefined, dateOfBirth: form.dateOfBirth || undefined, dsDivisionId: form.dsDivisionId || undefined })
                  setOpen(false)
                  navigate(`/counsellor/cases/${created.caseId}?tab=screening`)
                } catch (e) {
                  apiError.show(e)
                }
              }}
            >
              {t('common.create')}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('auth.fullName')} required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input label={t('auth.mobile')} type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label={t('auth.dateOfBirth')} type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
          <Select label={t('auth.gender')} value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })} options={(['female', 'male', 'other', 'undisclosed'] as const).map((g) => ({ value: g, label: t(`gender.${g}`) }))} />
          <Select label={t('referrals.receivingDs')} value={form.dsDivisionId} onChange={(e) => setForm({ ...form, dsDivisionId: e.target.value })} placeholder="—" options={dsOptions('kalutara')} />
          <Select
            label={t('profile.counsellingLanguage')}
            value={form.counsellingLanguage}
            onChange={(e) => setForm({ ...form, counsellingLanguage: e.target.value as CounsellingLanguage })}
            options={(['si', 'ta', 'en', 'sign'] as const).map((l) => ({ value: l, label: t(`lang.${l}`) }))}
          />
        </div>
      </Modal>
    </>
  )
}
