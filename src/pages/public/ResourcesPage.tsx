import { useMemo, useState, type ReactNode } from 'react'
import { FileDown, FileText, Headphones, PlayCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge, PageHeader, Spinner, cardSurfaceLink, cn } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { contentApi } from '../../services/api'
import { useUi } from '../../store/ui'
import type { ResourceItem } from '../../types'

export const KIND_ICON = { article: FileText, video: PlayCircle, audio: Headphones, download: FileDown }
const TOPICS: ResourceItem['topic'][] = ['stress', 'anxiety', 'mood', 'family', 'sleep', 'substance', 'wellbeing']
const KINDS: ResourceItem['kind'][] = ['article', 'video', 'audio', 'download']

/** Filter chip. aria-pressed carries the state, so it is not colour alone. */
function Chip({ selected, onClick, label, icon }: { selected: boolean; onClick: () => void; label: string; icon?: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-body-sm font-medium transition-colors duration-150',
        selected
          ? 'border-brand-700 bg-brand-700 text-white dark:border-brand-400 dark:bg-brand-400 dark:text-slate-950'
          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

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
      <div className="mb-6 space-y-4">
        <fieldset>
          <legend className="mb-2 text-body font-medium text-slate-800 dark:text-slate-200">{t('admin.kind')}</legend>
          <div className="flex flex-wrap gap-2">
            <Chip selected={!kind} onClick={() => setKind('')} label={t('resources.allTypes')} />
            {KINDS.map((x) => {
              const Icon = KIND_ICON[x]
              return <Chip key={x} selected={kind === x} onClick={() => setKind(x)} label={t(`resources.kind.${x}`)} icon={<Icon aria-hidden className="size-4 shrink-0" />} />
            })}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-body font-medium text-slate-800 dark:text-slate-200">{t('admin.topic')}</legend>
          <div className="flex flex-wrap gap-2">
            <Chip selected={!topic} onClick={() => setTopic('')} label={t('resources.allTopics')} />
            {TOPICS.map((x) => (
              <Chip key={x} selected={topic === x} onClick={() => setTopic(x)} label={t(`resources.topic.${x}`)} />
            ))}
          </div>
        </fieldset>
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
                  className={cn(cardSurfaceLink, "flex h-full flex-col p-5")}
                >
                  <div className="flex items-center gap-2">
                    <Icon aria-hidden className="size-6 text-brand-700 dark:text-brand-300" />
                    <Badge tone="brand">{t(`resources.kind.${r.kind}`)}</Badge>
                    <Badge>{t(`resources.topic.${r.topic}`)}</Badge>
                  </div>
                  <h2 className="mt-3 text-h3" lang={fallback ? 'en' : undefined}>
                    {version?.title}
                  </h2>
                  <p className="mt-1 flex-1 text-slate-600 dark:text-slate-300" lang={fallback ? 'en' : undefined}>
                    {version?.summary}
                  </p>
                  {fallback && <p className="mt-3 text-caption text-amber-800 dark:text-amber-300">{t('resources.notInLanguage')}</p>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
