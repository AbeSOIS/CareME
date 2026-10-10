import { useState } from 'react'
import { Activity, ClipboardCheck, CloudSun, EyeOff, HeartHandshake, Languages, LockKeyhole, Phone, Siren, Smile, Video, Wind } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, ButtonLink, Card, PrivacyPill, SectionHeader, Select, StatCard, cardSurface, cardSurfaceLink, cn } from '../../components/ui'
import { KIND_ICON } from './ResourcesPage'
import { ASSESSMENTS, ASSESSMENT_TYPES } from '../../config/assessments'
import { EMERGENCY_NUMBERS } from '../../config/defaults'
import { useAsync } from '../../hooks/useAsync'
import { useFormat } from '../../hooks/useFormat'
import { useLookups } from '../../hooks/useLookups'
import { contentApi } from '../../services/api'
import { useUi } from '../../store/ui'
import type { CounsellingLanguage, SelfAssessmentType } from '../../types'

const ASSESS_ICON: Record<SelfAssessmentType, typeof Activity> = { stress: Activity, anxiety: Wind, depression: CloudSun, wellbeing: Smile }
const FIND_LANGS: CounsellingLanguage[] = ['si', 'ta', 'en']

/** Soft decorative wave behind the hero. Inline SVG: no remote images anywhere. */
function HeroShape() {
  return (
    <svg aria-hidden viewBox="0 0 600 600" className="pointer-events-none absolute -top-24 -right-24 size-[32rem] opacity-20">
      <circle cx="300" cy="300" r="300" fill="var(--color-brand-400)" />
      <circle cx="300" cy="300" r="200" fill="var(--color-brand-300)" />
      <circle cx="300" cy="300" r="100" fill="var(--color-brand-200)" />
    </svg>
  )
}

export function HomePage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const navigate = useNavigate()
  const lang = useUi((s) => s.language)
  const { districtOptions } = useLookups()
  const [district, setDistrict] = useState('')
  const [language, setLanguage] = useState('')
  const resources = useAsync(() => contentApi.resources(), [])
  const preview = (resources.data ?? []).filter((r) => r.state === 'published').slice(0, 3)

  const steps = [
    { icon: ClipboardCheck, title: t('home.how1Title'), body: t('home.how1Body') },
    { icon: HeartHandshake, title: t('home.how2Title'), body: t('home.how2Body') },
    { icon: Video, title: t('home.how3Title'), body: t('home.how3Body') },
  ]

  return (
    <div className="space-y-12 sm:space-y-16">
      {/* ---------- Hero: one message, two next steps ---------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 to-brand-950 px-6 py-12 text-white sm:px-10 sm:py-16">
        <HeroShape />
        <div className="relative max-w-2xl">
          <p className="text-caption font-semibold tracking-wide text-brand-200 uppercase">{t('app.tagline')}</p>
          <h1 className="mt-3 text-display">{t('home.title')}</h1>
          <p className="mt-4 max-w-prose text-lead text-brand-50">{t('home.lead')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink to="/self-assessment" size="lg" variant="onDark">
              {t('home.ctaAssess')}
            </ButtonLink>
            <ButtonLink to="/counsellors" size="lg" variant="outlineOnDark">
              {t('home.ctaFind')}
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ---------- Emergency, kept visually separate from normal booking ---------- */}
      <section aria-labelledby="home-emergency" className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p id="home-emergency" className="flex items-center gap-3 text-h3 text-red-900 dark:text-red-100">
            <Siren aria-hidden className="size-6 shrink-0" />
            {t('home.emergencyStrip')}
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`tel:${EMERGENCY_NUMBERS[0].number}`}
              className="inline-flex min-h-13 items-center gap-2 rounded-xl bg-red-600 px-5 text-body font-bold text-white transition-colors duration-150 hover:bg-red-700"
            >
              <Phone aria-hidden className="size-5" />
              {t('emergency.call', { number: EMERGENCY_NUMBERS[0].number })}
            </a>
            <ButtonLink to="/emergency" size="lg" variant="secondary">
              {t('home.emergencyHelp')}
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* ---------- Quick self-checks ---------- */}
      <section aria-labelledby="home-quick">
        <SectionHeader id="home-quick" title={t('home.quickCheckTitle')} lead={t('home.quickCheckLead')} />
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ASSESSMENT_TYPES.map((type) => {
            const Icon = ASSESS_ICON[type]
            return (
              <li key={type}>
                <Link
                  to={`/self-assessment/${type}`}
                  className={cn(cardSurfaceLink, "@container flex h-full flex-col p-5")}
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/60">
                    <Icon aria-hidden className="size-6 text-brand-700 dark:text-brand-200" />
                  </span>
                  <span className="mt-3 text-h3 text-slate-900 dark:text-white">{t(`assess.${type}`)}</span>
                  {/* flex-1 description pushes the badge row to the bottom, so footers align across the row */}
                  <span className="mt-1 flex-1 text-body-sm text-slate-600 dark:text-slate-300">{t(`assess.${type}Desc`)}</span>
                  <span className="mt-4 flex flex-wrap items-center gap-2">
                    <Badge tone="brand">{t('assess.questions', { count: ASSESSMENTS[type].items.length })}</Badge>
                    <PrivacyPill label={t('home.anonBadge')} shortLabel={t('home.anonBadgeShort')} />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      {/* ---------- Reassurance ---------- */}
      <section aria-labelledby="anon" className="grid gap-4 md:grid-cols-2">
        <Card>
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/60">
            <EyeOff aria-hidden className="size-6 text-brand-700 dark:text-brand-200" />
          </span>
          <h2 id="anon" className="mt-3 text-h3 text-slate-900 dark:text-white">
            {t('home.anonTitle')}
          </h2>
          <p className="mt-2 max-w-prose text-body text-slate-600 dark:text-slate-300">{t('home.anonBody')}</p>
        </Card>
        <Card>
          <span className="inline-flex size-11 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/60">
            <LockKeyhole aria-hidden className="size-6 text-brand-700 dark:text-brand-200" />
          </span>
          <h2 className="mt-3 text-h3 text-slate-900 dark:text-white">{t('home.privacyTitle')}</h2>
          <p className="mt-2 max-w-prose text-body text-slate-600 dark:text-slate-300">{t('home.privacyBody')}</p>
        </Card>
      </section>

      {/* ---------- How it works ---------- */}
      <section aria-labelledby="how">
        <SectionHeader id="how" title={t('home.howTitle')} />
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className={cn(cardSurface, "p-5")}>
              <div className="flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-brand-700 text-body-sm font-bold text-white dark:bg-brand-400 dark:text-slate-950">{i + 1}</span>
                <Icon aria-hidden className="size-6 text-brand-700 dark:text-brand-300" />
              </div>
              <h3 className="mt-3 text-h3 text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-1 text-body text-slate-600 dark:text-slate-300">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---------- Find a counsellor: pre-fills the real search filters ---------- */}
      <section aria-labelledby="find" className="rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:p-8 dark:border-brand-800 dark:bg-slate-900">
        <SectionHeader id="find" title={t('home.findTitle')} lead={t('home.findLead')} />
        <form
          className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            const params = new URLSearchParams()
            if (district) params.set('district', district)
            if (language) params.set('language', language)
            navigate(`/counsellors${params.size ? `?${params}` : ''}`)
          }}
        >
          <Select
            label={t('search.district')}
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            options={districtOptions}
            placeholder={t('search.anyDistrict')}
          />
          <Select
            label={t('search.language')}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            options={FIND_LANGS.map((l) => ({ value: l, label: t(`lang.${l}`) }))}
            placeholder={t('search.anyLanguage')}
          />
          <Button type="submit" size="lg">
            {t('home.ctaFind')}
          </Button>
        </form>
      </section>

      {/* ---------- Resources preview ---------- */}
      {preview.length > 0 && (
        <section aria-labelledby="home-resources">
          <SectionHeader
            id="home-resources"
            title={t('home.resourcesTitle')}
            lead={t('home.resourcesLead')}
            actions={
              <ButtonLink to="/resources" variant="secondary">
                {t('home.resourcesAll')}
              </ButtonLink>
            }
          />
          <ul className="grid gap-4 sm:grid-cols-3">
            {preview.map((r) => {
              const version = r.versions[lang] ?? r.versions.en
              const Icon = KIND_ICON[r.kind]
              return (
                <li key={r.id}>
                  <Link
                    to={`/resources/${r.id}`}
                    className={cn(cardSurfaceLink, "flex h-full flex-col p-5")}
                  >
                    <span className="flex items-center gap-2">
                      <Icon aria-hidden className="size-5 text-brand-700 dark:text-brand-300" />
                      <Badge tone="brand">{t(`resources.kind.${r.kind}`)}</Badge>
                    </span>
                    <span className="mt-3 text-h3 text-slate-900 dark:text-white">{version?.title}</span>
                    <span className="mt-1 line-clamp-2 flex-1 text-body-sm text-slate-600 dark:text-slate-300">{version?.summary}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* ---------- Reach ---------- */}
      <section aria-labelledby="stats">
        <SectionHeader
          id="stats"
          title={
            <span className="flex items-center gap-2">
              <Languages aria-hidden className="size-6 text-brand-700 dark:text-brand-300" />
              {t('home.statsTitle')}
            </span>
          }
        />
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            [fmt.number(174), t('home.statsCounsellors')],
            [fmt.number(23), t('home.statsDistricts')],
            [fmt.number(3), t('home.statsLanguages')],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd>
                <StatCard value={value} label={label} />
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
