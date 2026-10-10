import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, DataTable, Input, Modal, PageHeader, Select, Spinner, Tabs, TextArea, type Tone } from '../../components/ui'
import { LANGUAGES } from '../../i18n'
import { useApiError } from '../../hooks/useApiError'
import { useAsync } from '../../hooks/useAsync'
import { useFormat } from '../../hooks/useFormat'
import { adminApi } from '../../services/api'
import { useUi } from '../../store/ui'
import type { LanguageCode, PublishState, ResourceItem, ResourceVersion } from '../../types'

const STATE_TONE: Record<PublishState, Tone> = { draft: 'warning', published: 'success', withdrawn: 'neutral' }
type Draft = Omit<ResourceItem, 'id' | 'state' | 'updatedAt'> & { id?: string }

export default function ContentPage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const lang = useUi((s) => s.language)
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const { data, loading, reload } = useAsync(() => adminApi.resources(), [])
  const [editing, setEditing] = useState<Draft | null>(null)
  const [editLang, setEditLang] = useState<LanguageCode>('en')

  const setVersion = (patch: Partial<ResourceVersion>) =>
    setEditing((d) => (d ? { ...d, versions: { ...d.versions, [editLang]: { title: '', summary: '', body: '', ...d.versions[editLang], ...patch } } } : d))

  const changeState = async (r: ResourceItem, state: PublishState) => {
    try {
      await adminApi.setResourceState(r.id, state)
      await reload()
    } catch (e) {
      apiError.show(e)
    }
  }

  return (
    <>
      <PageHeader
        title={t('admin.contentTitle')}
        lead={t('admin.contentLead')}
        actions={
          <Button
            icon={<Plus aria-hidden className="size-5" />}
            onClick={() => {
              setEditing({ kind: 'article', topic: 'wellbeing', versions: {} })
              setEditLang('en')
            }}
          >
            {t('admin.newResource')}
          </Button>
        }
      />
      {loading ? (
        <Spinner label={t('common.loading')} />
      ) : (
        <DataTable
          caption={t('admin.contentTitle')}
          rows={data ?? []}
          rowKey={(r) => r.id}
          columns={[
            { key: 'title', header: t('admin.titleField'), primary: true, render: (r) => (r.versions[lang] ?? r.versions.en)?.title },
            { key: 'kind', header: t('admin.kind'), render: (r) => t(`resources.kind.${r.kind}`) },
            {
              key: 'langs',
              header: t('common.language'),
              render: (r) => {
                const missing = LANGUAGES.filter((l) => !r.versions[l])
                return missing.length ? <Badge tone="warning">{t('admin.missingLanguages', { langs: missing.map((l) => t(`lang.${l}`)).join(', ') })}</Badge> : <Badge tone="success">si · ta · en</Badge>
              },
            },
            { key: 'state', header: t('common.status'), render: (r) => <Badge tone={STATE_TONE[r.state]}>{t(`admin.states.${r.state}`)}</Badge> },
            { key: 'updated', header: t('common.date'), render: (r) => fmt.date(r.updatedAt) },
            {
              key: 'actions',
              header: t('common.actions'),
              render: (r) => (
                <span className="flex flex-wrap justify-end gap-1 md:justify-start">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditing(r)
                      setEditLang('en')
                    }}
                  >
                    {t('common.edit')}
                  </Button>
                  {r.state !== 'published' && (
                    <Button size="sm" onClick={() => changeState(r, 'published')}>
                      {t('admin.publish')}
                    </Button>
                  )}
                  {r.state === 'published' && (
                    <Button size="sm" variant="secondary" onClick={() => changeState(r, 'withdrawn')}>
                      {t('admin.withdraw')}
                    </Button>
                  )}
                  {r.state === 'withdrawn' && (
                    <Button size="sm" variant="ghost" onClick={() => changeState(r, 'draft')}>
                      {t('admin.toDraft')}
                    </Button>
                  )}
                </span>
              ),
            },
          ]}
        />
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size="xl"
        title={editing?.id ? t('admin.editResource') : t('admin.newResource')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={!editing?.versions.en?.title}
              onClick={async () => {
                if (!editing) return
                try {
                  if (editing.id) await adminApi.updateResource(editing.id, editing)
                  else await adminApi.createResource(editing)
                  toast(t('admin.resourceSaved'), 'success')
                  setEditing(null)
                  await reload()
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
        {editing && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label={t('admin.kind')} value={editing.kind} onChange={(e) => setEditing({ ...editing, kind: e.target.value as ResourceItem['kind'] })} options={(['article', 'video', 'audio', 'download'] as const).map((k) => ({ value: k, label: t(`resources.kind.${k}`) }))} />
              <Select
                label={t('admin.topic')}
                value={editing.topic}
                onChange={(e) => setEditing({ ...editing, topic: e.target.value as ResourceItem['topic'] })}
                options={(['stress', 'anxiety', 'mood', 'family', 'sleep', 'substance', 'wellbeing'] as const).map((k) => ({ value: k, label: t(`resources.topic.${k}`) }))}
              />
            </div>
            <Tabs label={t('common.language')} active={editLang} onChange={(l) => setEditLang(l as LanguageCode)} tabs={(['en', 'si', 'ta'] as const).map((l) => ({ id: l, label: <span lang={l}>{t(`lang.${l}`)}</span>, badge: editing.versions[l] ? null : (
          <span className="inline-flex items-center" title={t('admin.translationMissing')}>
            <span aria-hidden className="size-2 rounded-full bg-amber-500" />
            <span className="sr-only">{t('admin.translationMissing')}</span>
          </span>
        ) }))}>
              <div className="space-y-4" lang={editLang}>
                <Input label={t('admin.titleField')} required={editLang === 'en'} value={editing.versions[editLang]?.title ?? ''} onChange={(e) => setVersion({ title: e.target.value })} />
                <Input label={t('admin.summary')} value={editing.versions[editLang]?.summary ?? ''} onChange={(e) => setVersion({ summary: e.target.value })} />
                <TextArea label={t('admin.body')} rows={8} value={editing.versions[editLang]?.body ?? ''} onChange={(e) => setVersion({ body: e.target.value })} />
              </div>
            </Tabs>
          </div>
        )}
      </Modal>
    </>
  )
}
