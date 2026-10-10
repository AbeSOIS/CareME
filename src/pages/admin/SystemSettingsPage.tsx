import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, Checkbox, Input, PageHeader, TextArea } from '../../components/ui'
import { useApiError } from '../../hooks/useApiError'
import { useSettings } from '../../store/settings'
import { useUi } from '../../store/ui'
import type { Role, Settings } from '../../types'

type NumKey = Exclude<{ [K in keyof Settings]-?: Settings[K] extends number ? K : never }[keyof Settings], undefined>

const GROUPS: Array<{ id: string; fields: NumKey[] }> = [
  { id: 'security', fields: ['idleTimeoutMin', 'idleWarningSec', 'lockoutThreshold'] },
  { id: 'appointments', fields: ['cancellationNoticeHours', 'noShowAfterMin', 'maxSessionsPerClient', 'maxSessionDurationMin', 'minorAgeThreshold'] },
  { id: 'emergency', fields: ['escalationPeriodMin'] },
  { id: 'groups', fields: ['groupDefaultCapacity', 'groupMaxCapacity'] },
  { id: 'files', fields: ['maxFileSizeMb'] },
  { id: 'service', fields: ['dashboardRefreshMin'] },
]
const MFA_ROLES: Role[] = ['beneficiary', 'counsellor', 'admin', 'analyst']

/** Administrator-configurable parameters (FR-080). Every change is audited. */
export default function SystemSettingsPage() {
  const { t } = useTranslation()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const { settings, save, load } = useSettings()
  const [draft, setDraft] = useState<Settings>(settings)
  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => setDraft(settings), [settings])

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        try {
          await save(draft)
          toast(t('admin.settingsSaved'), 'success')
        } catch (err) {
          apiError.show(err)
        }
      }}
    >
      <PageHeader title={t('admin.settingsTitle')} lead={t('admin.settingsLead')} actions={<Button type="submit">{t('common.save')}</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <Card key={g.id}>
            <h2 className="mb-4 text-h3">{t(`admin.settingsGroups.${g.id}`)}</h2>
            <div className="space-y-4">
              {g.fields.map((f) => (
                <Input key={f} label={t(`admin.fields.${f}`)} type="number" min={1} required value={draft[f]} onChange={(e) => setDraft({ ...draft, [f]: Number(e.target.value) })} />
              ))}
              {g.id === 'security' && (
                <>
                  <fieldset>
                    <legend className="mb-2 font-medium">{t('admin.fields.mfaRequiredRoles')}</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {MFA_ROLES.map((r) => (
                        <Checkbox
                          key={r}
                          label={t(`roles.${r}`)}
                          checked={draft.mfaRequiredRoles.includes(r)}
                          onChange={(e) => setDraft({ ...draft, mfaRequiredRoles: e.target.checked ? [...draft.mfaRequiredRoles, r] : draft.mfaRequiredRoles.filter((x) => x !== r) })}
                        />
                      ))}
                    </div>
                  </fieldset>
                  <Checkbox label={t('admin.fields.otpRequiredForRegistration')} checked={draft.otpRequiredForRegistration} onChange={(e) => setDraft({ ...draft, otpRequiredForRegistration: e.target.checked })} />
                </>
              )}
              {g.id === 'emergency' && (
                <TextArea
                  label={t('admin.fields.escalationPath')}
                  rows={3}
                  value={draft.escalationPath.join('\n')}
                  onChange={(e) => setDraft({ ...draft, escalationPath: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                />
              )}
              {g.id === 'files' && <Input label={t('admin.fields.allowedFileTypes')} value={draft.allowedFileTypes.join(', ')} onChange={(e) => setDraft({ ...draft, allowedFileTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />}
              {g.id === 'service' && <TextArea label={t('admin.fields.maintenanceNotice')} rows={2} value={draft.maintenanceNotice ?? ''} onChange={(e) => setDraft({ ...draft, maintenanceNotice: e.target.value || undefined })} />}
            </div>
          </Card>
        ))}
      </div>
    </form>
  )
}
