import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, PageHeader, Spinner, Tabs } from '../../components/ui'
import { ACTIONS, DATA_TYPES, ROLES } from '../../domain/permissions'
import { useApiError } from '../../hooks/useApiError'
import { useAsync } from '../../hooks/useAsync'
import { adminApi } from '../../services/api'
import { useUi } from '../../store/ui'
import type { PermissionAction, PermissionMatrix, PermissionScope, Role } from '../../types'

const SCOPES: Array<PermissionScope | 'none'> = ['none', 'own', 'aggregate', 'all']

export default function RolesPage() {
  const { t } = useTranslation()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const { data, loading } = useAsync(() => adminApi.permissions(), [])
  const [matrix, setMatrix] = useState<PermissionMatrix | null>(null)
  const [role, setRole] = useState<Role>('counsellor')
  useEffect(() => {
    if (data) setMatrix(data)
  }, [data])
  if (loading || !matrix) return <Spinner label={t('common.loading')} />

  const set = (dt: (typeof DATA_TYPES)[number], action: PermissionAction, scope: PermissionScope | 'none') => {
    setMatrix((m) => {
      const next = structuredClone(m!)
      const row = { ...(next[role][dt] ?? {}) }
      if (scope === 'none') delete row[action]
      else row[action] = scope
      next[role] = { ...next[role], [dt]: row }
      return next
    })
  }

  return (
    <>
      <PageHeader
        title={t('admin.rolesTitle')}
        lead={t('admin.rolesLead')}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  setMatrix(await adminApi.resetPermissions())
                  toast(t('admin.permissionsSaved'), 'success')
                } catch (e) {
                  apiError.show(e)
                }
              }}
            >
              {t('admin.resetDefaults')}
            </Button>
            <Button
              onClick={async () => {
                try {
                  setMatrix(await adminApi.savePermissions(matrix))
                  toast(t('admin.permissionsSaved'), 'success')
                } catch (e) {
                  apiError.show(e)
                }
              }}
            >
              {t('common.save')}
            </Button>
          </>
        }
      />
      <Tabs label={t('admin.roles')} active={role} onChange={(r) => setRole(r as Role)} tabs={ROLES.map((r) => ({ id: r, label: t(`roles.${r}`) }))}>
        <div className="relative overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full min-w-[40rem] text-sm">
            <caption className="sr-only">
              {t('admin.rolesTitle')} — {t(`roles.${role}`)}
            </caption>
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th scope="col" className="px-3 py-2 text-left">
                  {t('admin.dataType')}
                </th>
                {ACTIONS.map((a) => (
                  <th key={a} scope="col" className="px-3 py-2 text-left">
                    {t(`admin.action.${a}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {DATA_TYPES.map((dt) => (
                <tr key={dt}>
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    {t(`admin.dataTypes.${dt}`)}
                  </th>
                  {ACTIONS.map((a) => {
                    const value = matrix[role][dt]?.[a] ?? 'none'
                    return (
                      <td key={a} className="px-3 py-1.5">
                        <label className="sr-only" htmlFor={`${role}-${dt}-${a}`}>
                          {t(`admin.dataTypes.${dt}`)} — {t(`admin.action.${a}`)}
                        </label>
                        <select
                          id={`${role}-${dt}-${a}`}
                          value={value}
                          onChange={(e) => set(dt, a, e.target.value as PermissionScope | 'none')}
                          className={`min-h-9 w-full rounded-md border px-2 ${value === 'none' ? 'border-slate-200 text-slate-500 dark:border-slate-700' : 'border-brand-400 bg-brand-50 font-semibold text-brand-900 dark:bg-brand-950 dark:text-brand-100'}`}
                        >
                          {SCOPES.map((s) => (
                            <option key={s} value={s}>
                              {t(`admin.scope.${s}`)}
                            </option>
                          ))}
                        </select>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tabs>
    </>
  )
}
