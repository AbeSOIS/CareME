import { useMemo, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Checkbox, DataTable, Input, Modal, PageHeader, Select, Spinner, Tabs, type Tone } from '../../components/ui'
import { DEMO_PASSWORD } from '../../config/defaults'
import { ROLES } from '../../domain/permissions'
import { useApiError } from '../../hooks/useApiError'
import { useAsync } from '../../hooks/useAsync'
import { useFormat } from '../../hooks/useFormat'
import { useLookups } from '../../hooks/useLookups'
import { adminApi } from '../../services/api'
import { useUi } from '../../store/ui'
import type { LanguageCode, Role, User } from '../../types'

const ASSIGNABLE: Role[] = ROLES.filter((r) => r !== 'anonymous' && r !== 'emergencyOfficer')
const STATUS_TONE: Record<User['status'], Tone> = { active: 'success', locked: 'warning', deactivated: 'neutral' }

export default function UsersPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const { districtName } = useLookups()
  const users = useAsync(() => adminApi.users(), [])
  const beneficiaries = useAsync(() => adminApi.beneficiaries(), [])
  const counsellors = useAsync(() => adminApi.counsellors(), [])
  const [tab, setTab] = useState('accounts')
  const [q, setQ] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [editing, setEditing] = useState<Partial<User> | null>(null)

  const rows = useMemo(
    () => (users.data ?? []).filter((u) => (!q || `${u.displayName} ${u.username}`.toLowerCase().includes(q.toLowerCase())) && (!roleFilter || u.roles.includes(roleFilter as Role))),
    [users.data, q, roleFilter],
  )

  const patch = async (u: User, p: Partial<User>) => {
    try {
      const updated = await adminApi.updateUser(u.id, p)
      users.setData((list) => (list ?? []).map((x) => (x.id === u.id ? updated : x)))
      toast(t('admin.userUpdated'), 'success')
    } catch (e) {
      apiError.show(e)
    }
  }

  const save = async () => {
    if (!editing) return
    try {
      if (editing.id) {
        await patch(editing as User, { displayName: editing.displayName, roles: editing.roles, counsellorId: editing.counsellorId })
      } else {
        await adminApi.createUser({
          username: editing.username ?? '',
          displayName: editing.displayName ?? '',
          roles: editing.roles ?? [],
          preferredLanguage: (editing.preferredLanguage ?? 'si') as LanguageCode,
          counsellorId: editing.counsellorId || undefined,
        })
        toast(t('admin.userCreated', { password: DEMO_PASSWORD }), 'success')
        await users.reload()
      }
      setEditing(null)
    } catch (e) {
      apiError.show(e)
    }
  }

  return (
    <>
      <PageHeader
        title={t('admin.usersTitle')}
        lead={t('admin.usersLead')}
        actions={
          <Button icon={<UserPlus aria-hidden className="size-5" />} onClick={() => setEditing({ roles: ['counsellor'], preferredLanguage: 'si' })}>
            {t('admin.newUser')}
          </Button>
        }
      />
      <Tabs label={t('admin.usersTitle')} active={tab} onChange={setTab} tabs={[{ id: 'accounts', label: t('admin.usersTitle') }, { id: 'beneficiaries', label: t('admin.beneficiaryRecords') }]}>
        {tab === 'accounts' ? (
          <>
            <div className="mb-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(13rem,1fr))] lg:max-w-2xl">
              <Input label={t('common.search')} type="search" value={q} onChange={(e) => setQ(e.target.value)} />
              <Select label={t('admin.roles')} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} placeholder={t('common.all')} options={ASSIGNABLE.map((r) => ({ value: r, label: t(`roles.${r}`) }))} />
            </div>
            {users.loading ? (
              <Spinner label={t('common.loading')} />
            ) : (
              <DataTable
                caption={t('admin.usersTitle')}
                rows={rows}
                rowKey={(u) => u.id}
                columns={[
                  {
                    key: 'name',
                    header: t('admin.displayName'),
                    primary: true,
                    render: (u) => (
                      <span>
                        <span className="block font-semibold">{u.displayName}</span>
                        <span className="text-caption break-all text-slate-600 dark:text-slate-300">{u.username}</span>
                      </span>
                    ),
                  },
                  { key: 'roles', header: t('admin.roles'), render: (u) => <span className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r} tone="brand">{t(`roles.${r}`)}</Badge>)}</span> },
                  { key: 'status', header: t('common.status'), render: (u) => <Badge tone={STATUS_TONE[u.status]}>{t(`admin.status.${u.status}`)}</Badge> },
                  { key: 'mfa', header: 'MFA', render: (u) => (u.mfaEnabled ? t('common.yes') : '—') },
                  { key: 'last', header: t('admin.lastLogin'), render: (u) => (u.lastLoginAt ? fmt.dateTime(u.lastLoginAt) : t('admin.never')) },
                  {
                    key: 'actions',
                    header: t('common.actions'),
                    render: (u) => (
                      <span className="flex flex-wrap justify-end gap-1 md:justify-start">
                        <Button size="sm" variant="ghost" onClick={() => setEditing(u)}>
                          {t('common.edit')}
                        </Button>
                        {u.status === 'locked' && (
                          <Button size="sm" variant="secondary" onClick={() => patch(u, { status: 'active' })}>
                            {t('admin.unlock')}
                          </Button>
                        )}
                        {u.status === 'active' ? (
                          <Button size="sm" variant="ghost" onClick={() => patch(u, { status: 'deactivated' })}>
                            {t('admin.deactivate')}
                          </Button>
                        ) : u.status === 'deactivated' ? (
                          <Button size="sm" variant="secondary" onClick={() => patch(u, { status: 'active' })}>
                            {t('admin.reactivate')}
                          </Button>
                        ) : null}
                      </span>
                    ),
                  },
                ]}
              />
            )}
          </>
        ) : (
          <DataTable
            caption={t('admin.beneficiaryRecords')}
            rows={beneficiaries.data ?? []}
            rowKey={(b) => b.id}
            columns={[
              { key: 'code', header: t('profile.clientCode'), primary: true, render: (b) => <span className="font-mono">{b.clientCode}</span> },
              { key: 'name', header: t('common.name'), render: (b) => b.fullName },
              { key: 'district', header: t('auth.district'), render: (b) => districtName(b.districtId) },
              { key: 'created', header: t('portal.opened'), render: (b) => fmt.date(b.createdAt) },
              {
                key: 'flags',
                header: t('common.status'),
                render: (b) => (
                  <span className="flex flex-wrap gap-1">
                    {b.pendingRegistration && <Badge tone="info">{t('portal.pendingRegistration')}</Badge>}
                    {b.erasureRequestedAt && <Badge tone="danger">{t('admin.erasureRequested')}</Badge>}
                  </span>
                ),
              },
            ]}
          />
        )}
      </Tabs>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? t('common.edit') : t('admin.newUser')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button disabled={!editing?.displayName || !editing.username || !editing.roles?.length} onClick={save}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Input label={t('admin.username')} required readOnly={Boolean(editing.id)} value={editing.username ?? ''} onChange={(e) => setEditing({ ...editing, username: e.target.value })} />
            <Input label={t('admin.displayName')} required value={editing.displayName ?? ''} onChange={(e) => setEditing({ ...editing, displayName: e.target.value })} />
            <fieldset>
              <legend className="mb-2 font-medium">{t('admin.roles')}</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {ASSIGNABLE.map((r) => (
                  <Checkbox
                    key={r}
                    label={t(`roles.${r}`)}
                    checked={editing.roles?.includes(r) ?? false}
                    onChange={(e) => setEditing({ ...editing, roles: e.target.checked ? [...(editing.roles ?? []), r] : (editing.roles ?? []).filter((x) => x !== r) })}
                  />
                ))}
              </div>
            </fieldset>
            {editing.roles?.includes('counsellor') && (
              <Select
                label={t('admin.linkedCounsellor')}
                value={editing.counsellorId ?? ''}
                onChange={(e) => setEditing({ ...editing, counsellorId: e.target.value })}
                placeholder="—"
                options={(counsellors.data ?? []).map((c) => ({ value: c.id, label: `${c.fullName} · ${districtName(c.districtId)}` }))}
              />
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
