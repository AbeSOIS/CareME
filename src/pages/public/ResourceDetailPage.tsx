import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Callout, Spinner } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { contentApi } from '../../services/api'
import { useUi } from '../../store/ui'
import { NotFoundPage } from './NotFoundPage'
import { KIND_ICON } from './ResourcesPage'

export function ResourceDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const lang = useUi((s) => s.language)
  const { data, loading, error } = useAsync(() => contentApi.resource(id!), [id])
  if (loading) return <Spinner label={t('common.loading')} />
  if (error || !data) return <NotFoundPage />
  const fallback = !data.versions[lang]
  const v = data.versions[lang] ?? data.versions.en!
  const Icon = KIND_ICON[data.kind]

  const download = () => {
    const blob = new Blob([`${v.title}\n\n${v.body}\n`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/resources" className="text-sm font-medium text-brand-800 hover:underline dark:text-brand-200">
        ← {t('resources.backToList')}
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{t(`resources.kind.${data.kind}`)}</Badge>
        <Badge>{t(`resources.topic.${data.topic}`)}</Badge>
      </div>
      <h1 className="mt-3 text-3xl font-bold" lang={fallback ? 'en' : undefined}>
        {v.title}
      </h1>
      {fallback && (
        <Callout tone="warning" className="mt-4">
          {t('resources.notInLanguage')}
        </Callout>
      )}
      <p className="mt-4 text-lg text-slate-700 dark:text-slate-300" lang={fallback ? 'en' : undefined}>
        {v.summary}
      </p>
      {(data.kind === 'video' || data.kind === 'audio') && (
        <div className="mt-6 flex aspect-video items-center justify-center rounded-2xl bg-slate-900 p-6 text-center text-slate-200">
          <div>
            <Icon aria-hidden className="mx-auto size-12" />
            <p className="mt-3 text-sm">{t('resources.mediaPlaceholder')}</p>
          </div>
        </div>
      )}
      <div className="mt-6 space-y-4 text-lg leading-relaxed" lang={fallback ? 'en' : undefined}>
        {v.body.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
      {data.kind === 'download' && (
        <Button className="mt-6" onClick={download} icon={<Download aria-hidden className="size-5" />}>
          {t('resources.download')}
        </Button>
      )}
    </article>
  )
}
