import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, DataTable, Input, PageHeader, Select, Spinner } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useFormat } from '../../hooks/useFormat'
import { adminApi } from '../../services/api'

const TYPES = ['login', 'logout', 'account', 'record', 'admin', 'role', 'config', 'alert', 'security']

/** Read-only, append-only audit log search by user, date range, event type and record (FR-082). */
export default function AuditPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const users = useAsync(() => adminApi.users(), [])
  const [q, setQ] = useState({ userId: '', type: '', from: '', to: '', target: '' })
  const entries = useAsync(() => adminApi.audit(q), [q.userId, q.type, q.from, q.to, q.target])

  return (
    <>
      <PageHeader title={t('admin.auditTitle')} lead={t('admin.auditLead')} />
      <div className="mb-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(12rem,1fr))]">
        <Select label={t('admin.auditUser')} value={q.userId} onChange={(e) => setQ({ ...q, userId: e.target.value })} placeholder={t('common.all')} options={(users.data ?? []).map((u) => ({ value: u.id, label: u.displayName }))} />
        <Select label={t('admin.auditType')} value={q.type} onChange={(e) => setQ({ ...q, type: e.target.value })} placeholder={t('common.all')} options={TYPES.map((x) => ({ value: x, label: x }))} />
        <Input label={t('common.from')} type="date" value={q.from} onChange={(e) => setQ({ ...q, from: e.target.value })} />
        <Input label={t('common.to')} type="date" value={q.to} onChange={(e) => setQ({ ...q, to: e.target.value })} />
        <Input label={t('admin.auditTarget')} type="search" value={q.target} onChange={(e) => setQ({ ...q, target: e.target.value })} />
      </div>
      {entries.loading && !entries.data ? (
        <Spinner label={t('common.loading')} />
      ) : (
        <DataTable
          caption={t('admin.auditTitle')}
          rows={entries.data ?? []}
          rowKey={(e) => e.id}
          columns={[
            { key: 'at', header: t('admin.auditWhen'), primary: true, render: (e) => fmt.dateTime(e.at) },
            { key: 'type', header: t('admin.auditType'), render: (e) => <Badge tone={e.type.startsWith('alert') ? 'danger' : e.type.includes('failure') || e.type.includes('locked') ? 'warning' : 'neutral'}>{e.type}</Badge> },
            { key: 'actor', header: t('admin.auditUser'), render: (e) => e.actorName ?? t('admin.system') },
            { key: 'target', header: t('admin.auditTarget'), render: (e) => <span className="font-mono text-caption break-all">{e.target}</span> },
            { key: 'detail', header: t('admin.auditDetail'), render: (e) => e.detail },
          ]}
        />
      )}
    </>
  )
}
