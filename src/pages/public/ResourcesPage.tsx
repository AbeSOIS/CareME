import { useMemo, useState } from 'react'
import { FileDown, FileText, Headphones, PlayCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge, PageHeader, Select, Spinner } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { contentApi } from '../../services/api'
import { useUi } from '../../store/ui'
import type { ResourceItem } from '../../types'

export const KIND_ICON = { article: FileText, video: PlayCircle, audio: Headphones, download: FileDown }
const TOPICS: ResourceItem['topic'][] = ['stress', 'anxiety', 'mood', 'family', 'sleep', 'substance', 'wellbeing']
const KINDS: ResourceItem['kind'][] = ['article', 'video', 'audio', 'download']

export function ResourcesPage() {
  const { t } = useTranslation()
  const lang = useUi((s) => s.language)
  const { data, loading } = useAsync(() => contentApi.resources(), [])
  const [topic, setTopic] = useState('')
  const [kind, setKind] = useState('')
  const items = useMemo(() => (data ?? []).filter((r) => (!topic || r.topic === topic) && (!kind || r.kind === kind)), [data, topic, kind])

  return (
    <>
      <PageHeader title={t('resources.title')} lead={t('resources.lead')} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
        <Select label={t('admin.topic')} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t('resources.allTopics')} options={TOPICS.map((x) => ({ value: x, label: t(`resources.topic.${x}`) }))} />
        <Select label={t('admin.kind')} value={kind} onChange={(e) => setKind(e.target.value)} placeholder={t('resources.allTypes')} options={KINDS.map((x) => ({ value: x, label: t(`resources.kind.${x}`) }))} />
      </div>
      {loading ? (
        <Spinner label={t('common.loading')} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => {
            const version = r.versions[lang] ?? r.versions.en
            const Icon = KIND_ICON[r.kind]
            const fallback = !r.versions[lang]
            return (
              <li key={r.id}>
                <Link
                  to={`/resources/${r.id}`}
                  className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 transition-shadow hover:border-brand-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex items-center gap-2">
                    <Icon aria-hidden className="size-6 text-brand-700 dark:text-brand-300" />
                    <Badge tone="brand">{t(`resources.kind.${r.kind}`)}</Badge>
                    <Badge>{t(`resources.topic.${r.topic}`)}</Badge>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold" lang={fallback ? 'en' : undefined}>
                    {version?.title}
                  </h2>
                  <p className="mt-1 flex-1 text-slate-600 dark:text-slate-300" lang={fallback ? 'en' : undefined}>
                    {version?.summary}
                  </p>
                  {fallback && <p className="mt-3 text-xs text-amber-800 dark:text-amber-300">{t('resources.notInLanguage')}</p>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
