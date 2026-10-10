import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Checkbox, DataTable, Input, Modal, PageHeader, Select, Spinner, TextArea } from '../../components/ui'
import { useApiError } from '../../hooks/useApiError'
import { useAsync } from '../../hooks/useAsync'
import { useLookups } from '../../hooks/useLookups'
import { adminApi } from '../../services/api'
import { useUi } from '../../store/ui'
import type { Counsellor, CounsellingLanguage } from '../../types'

const LANGS: CounsellingLanguage[] = ['si', 'ta', 'en', 'sign']
const EMPTY: Omit<Counsellor, 'id'> = { fullName: '', gender: 'female', districtId: 'kalutara', languages: ['si'], signLanguage: false, remoteAllowed: false, active: true, bio: '', qualifications: [] }

export default function CounsellorsAdminPage() {
  const { t } = useTranslation()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const { districtName, districtOptions, dsOptions } = useLookups()
  const { data, loading, setData } = useAsync(() => adminApi.counsellors(), [])
  const [q, setQ] = useState('')
  const [district, setDistrict] = useState('')
  const [editing, setEditing] = useState<(Omit<Counsellor, 'id'> & { id?: string }) | null>(null)
  const rows = useMemo(() => (data ?? []).filter((c) => (!q || c.fullName.toLowerCase().includes(q.toLowerCase())) && (!district || c.districtId === district)), [data, q, district])

  const save = async () => {
    if (!editing) return
    try {
      const saved = editing.id ? await adminApi.updateCounsellor(editing.id, editing) : await adminApi.createCounsellor({ ...editing, signLanguage: editing.languages.includes('sign') })
      setData((list) => (editing.id ? (list ?? []).map((c) => (c.id === saved.id ? saved : c)) : [...(list ?? []), saved]))
      setEditing(null)
      toast(t('admin.counsellorSaved'), 'success')
    } catch (e) {
      apiError.show(e)
    }
  }

  return (
    <>
      <PageHeader
        title={t('admin.counsellorsTitle')}
        lead={t('admin.counsellorsLead', { count: data?.length ?? 0 })}
        actions={
          <Button icon={<Plus aria-hidden className="size-5" />} onClick={() => setEditing({ ...EMPTY })}>
            {t('admin.newCounsellor')}
          </Button>
        }
      />
      <div className="mb-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))] lg:max-w-2xl">
        <Input label={t('common.search')} type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select label={t('auth.district')} value={district} onChange={(e) => setDistrict(e.target.value)} placeholder={t('dashboard.allDistricts')} options={districtOptions} />
      </div>
      {loading ? (
        <Spinner label={t('common.loading')} />
      ) : (
        <DataTable
          caption={t('admin.counsellorsTitle')}
          rows={rows.slice(0, 200)}
          rowKey={(c) => c.id}
          columns={[
            { key: 'name', header: t('common.name'), primary: true, render: (c) => c.fullName },
            { key: 'district', header: t('auth.district'), render: (c) => districtName(c.districtId) },
            { key: 'langs', header: t('search.languages'), render: (c) => <span className="flex flex-wrap gap-1">{c.languages.map((l) => <Badge key={l} tone={l === 'sign' ? 'info' : 'brand'}>{t(`lang.${l}`)}</Badge>)}</span> },
            { key: 'remote', header: t('search.remote'), render: (c) => (c.remoteAllowed ? t('common.yes') : '—') },
            { key: 'active', header: t('common.status'), render: (c) => <Badge tone={c.active ? 'success' : 'neutral'}>{c.active ? t('admin.active') : t('admin.inactive')}</Badge> },
            {
              key: 'edit',
              header: t('common.actions'),
              render: (c) => (
                <Button size="sm" variant="ghost" onClick={() => setEditing(c)} aria-label={`${t('common.edit')} ${c.fullName}`}>
                  {t('common.edit')}
                </Button>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing?.id ? editing.fullName : t('admin.newCounsellor')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button disabled={!editing?.fullName || !editing.languages.length} onClick={save}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('auth.fullName')} required value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} />
              <Select label={t('auth.gender')} value={editing.gender} onChange={(e) => setEditing({ ...editing, gender: e.target.value as Counsellor['gender'] })} options={(['female', 'male', 'other'] as const).map((g) => ({ value: g, label: t(`gender.${g}`) }))} />
              <Select label={t('auth.district')} required value={editing.districtId} onChange={(e) => setEditing({ ...editing, districtId: e.target.value, dsDivisionId: undefined })} options={districtOptions} />
              <Select label={t('referrals.receivingDs')} value={editing.dsDivisionId ?? ''} onChange={(e) => setEditing({ ...editing, dsDivisionId: e.target.value || undefined })} placeholder="—" options={dsOptions(editing.districtId)} />
            </div>
            <fieldset>
              <legend className="mb-2 font-medium">{t('search.languages')}</legend>
              <div className="flex flex-wrap gap-4">
                {LANGS.map((l) => (
                  <Checkbox
                    key={l}
                    label={t(`lang.${l}`)}
                    checked={editing.languages.includes(l)}
                    onChange={(e) => setEditing({ ...editing, languages: e.target.checked ? [...editing.languages, l] : editing.languages.filter((x) => x !== l) })}
                  />
                ))}
              </div>
            </fieldset>
            <Checkbox label={t('admin.remoteAllowed')} checked={editing.remoteAllowed} onChange={(e) => setEditing({ ...editing, remoteAllowed: e.target.checked })} />
            <Checkbox label={t('admin.active')} checked={editing.active} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
            <TextArea label={t('admin.bio')} rows={3} value={editing.bio} onChange={(e) => setEditing({ ...editing, bio: e.target.value })} />
          </div>
        )}
      </Modal>
    </>
  )
}
