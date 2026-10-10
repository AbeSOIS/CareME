import { useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { CallbackForm } from '../../components/feature/CallbackForm'
import { CounsellorCard } from '../../components/feature/CounsellorCard'
import { EmergencyInfo } from '../../components/feature/EmergencyInfo'
import { Callout, Button, Card, Checkbox, PageHeader, Select, Spinner } from '../../components/ui'
import { useAsync } from '../../hooks/useAsync'
import { useLookups } from '../../hooks/useLookups'
import { bookingApi } from '../../services/api'
import type { CounsellingLanguage } from '../../types'

const LANGS: CounsellingLanguage[] = ['si', 'ta', 'en', 'sign']

/** Numbered marker for the no-counsellor fallback options, so the order is explicit. */
function StepNumber({ n }: { n: number }) {
  return (
    <span aria-hidden className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-700 text-caption font-bold text-white dark:bg-brand-400 dark:text-slate-950">
      {n}
    </span>
  )
}

export function CounsellorSearchPage() {
  const { t } = useTranslation()
  const { districtOptions, districtName } = useLookups()
  const [params, setParams] = useSearchParams()
  const districtId = params.get('district') ?? ''
  const language = (params.get('language') ?? '') as CounsellingLanguage | ''
  const signLanguage = params.get('sign') === '1'
  const [confirmedLang, setConfirmedLang] = useState<CounsellingLanguage | null>(null)

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
    setConfirmedLang(null)
  }

  const query = { districtId: districtId || undefined, language: language || undefined, signLanguage: signLanguage || undefined }
  const list = useAsync(() => bookingApi.counsellors(query), [districtId, language, signLanguage])
  const withSlots = useMemo(() => (list.data ?? []).filter((c) => c.nextSlot), [list.data])
  const needsFallback = !list.loading && withSlots.length === 0 && Boolean(language || districtId || signLanguage)
  const fallback = useAsync(() => (needsFallback ? bookingApi.search(query) : Promise.resolve(null)), [needsFallback, districtId, language, signLanguage])
  const effectiveLang: CounsellingLanguage = signLanguage ? 'sign' : language || 'si'
  const otherLangs = LANGS.filter((l) => l !== effectiveLang && l !== 'sign')
  const alt = useAsync(
    () => (confirmedLang ? bookingApi.counsellors({ districtId: districtId || undefined, language: confirmedLang }) : Promise.resolve([])),
    [confirmedLang, districtId],
  )

  return (
    <>
      <PageHeader title={t('search.title')} lead={t('search.lead')} />
      <Card className="mb-6">
        <form className="grid gap-4 md:grid-cols-3 md:items-end" onSubmit={(e) => e.preventDefault()} role="search">
          <Select label={t('search.district')} value={districtId} onChange={(e) => update('district', e.target.value)} placeholder={t('search.anyDistrict')} options={districtOptions} />
          <Select
            label={t('search.language')}
            value={language}
            onChange={(e) => update('language', e.target.value)}
            placeholder={t('search.anyLanguage')}
            options={LANGS.filter((l) => l !== 'sign').map((l) => ({ value: l, label: t(`lang.${l}`) }))}
          />
          <Checkbox className="md:pb-3" label={t('search.signLanguage')} checked={signLanguage} onChange={(e) => update('sign', e.target.checked ? '1' : '')} />
        </form>
      </Card>

      {list.loading ? (
        <Spinner label={t('common.loading')} />
      ) : withSlots.length > 0 ? (
        <>
          <p aria-live="polite" className="mb-4 text-body font-semibold">
            {t('search.results', { count: withSlots.length })}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {withSlots.slice(0, 30).map((c) => (
              <li key={c.id}>
                <CounsellorCard counsellor={c} nextSlot={c.nextSlot} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="space-y-6" aria-live="polite">
          <h2 className="text-h2">
            {t('search.fallbackTitle', { district: districtId ? districtName(districtId) : t('search.anyDistrict'), language: t(`lang.${effectiveLang}`) })}
          </h2>

          {fallback.data?.kind === 'remote' && (
            <section aria-labelledby="remote-offer" className="space-y-3">
              <h3 id="remote-offer" className="flex items-center gap-2 text-h3">
                <StepNumber n={1} />
                {t('search.remoteOfferTitle', { language: t(`lang.${effectiveLang}`) })}
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                {t('search.remoteOfferBody', { name: fallback.data.offer.counsellor.fullName, district: districtName(fallback.data.offer.counsellor.districtId) })}
              </p>
              <div className="max-w-md">
                <CounsellorCard counsellor={fallback.data.offer.counsellor} nextSlot={fallback.data.offer.slot} bookLabel={t('search.bookThis')} />
              </div>
            </section>
          )}

          <Card>
            <h3 className="flex items-center gap-2 text-h3">
              <StepNumber n={2} />
              {t('search.otherLanguageTitle')}
            </h3>
            <p className="mt-2 max-w-prose text-body text-slate-600 dark:text-slate-300">{t('search.otherLanguageBody')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {otherLangs.map((l) => (
                <Button
                  key={l}
                  variant={confirmedLang === l ? 'primary' : 'secondary'}
                  size="sm"
                  aria-pressed={confirmedLang === l}
                  aria-label={t('search.confirmLanguage', { language: t(`lang.${l}`) })}
                  icon={<Check aria-hidden className="size-4" />}
                  onClick={() => setConfirmedLang(confirmedLang === l ? null : l)}
                >
                  {t(`lang.${l}`)}
                </Button>
              ))}
            </div>
            {confirmedLang && (
              <div className="mt-4">
                {alt.loading ? (
                  <Spinner label={t('common.loading')} />
                ) : (
                  <ul className="grid gap-4 sm:grid-cols-2">
                    {(alt.data ?? [])
                      .filter((c) => c.nextSlot)
                      .slice(0, 6)
                      .map((c) => (
                        <li key={c.id}>
                          <CounsellorCard counsellor={c} nextSlot={c.nextSlot} />
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </Card>

          <Card>
            <h3 className="flex items-center gap-2 text-h3">
              <StepNumber n={3} />
              {t('search.callbackTitle')}
            </h3>
            <p className="mt-2 max-w-prose text-body text-slate-600 dark:text-slate-300">{t('search.callbackBody')}</p>
            <Callout tone="warning" className="my-4">
              {t('emergency.notEmergency')}
            </Callout>
            <CallbackForm districtId={districtId || undefined} language={effectiveLang} />
          </Card>

          <EmergencyInfo />
        </div>
      )}
    </>
  )
}
