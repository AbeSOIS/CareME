import { useState } from 'react'
import { Activity, ClipboardCheck, CloudSun, EyeOff, HeartHandshake, Languages, LockKeyhole, Phone, Siren, Smile, Video, Wind } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, ButtonLink, Card, PrivacyPill, SectionHeader, Select, Tilt3D, cardSurface, cardSurfaceLink, cn } from '../../components/ui'
import { BreathingExercise } from '../../components/feature/BreathingExercise'
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

/** Bold numbered eyebrow above a section heading — purely decorative, no new copy to translate. */
function SectionNumber({ n }: { n: string }) {
  return (
    <div className="mb-3 flex items-center gap-3 text-caption font-extrabold tracking-[0.2em] text-brand-600 dark:text-brand-300">
      <span aria-hidden className="h-0.5 w-9 bg-brand-600 dark:bg-brand-400" />
      {n}
    </div>
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
      <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-white/60 via-brand-50/40 to-brand-100/50 px-6 py-12 shadow-[0_1px_0_rgba(255,255,255,0.6)_inset] backdrop-blur-[2px] sm:px-10 sm:py-16 dark:border-white/10 dark:from-slate-950/70 dark:via-slate-900/50 dark:to-brand-950/50">
        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-3 rounded-full bg-white/70 py-1.5 pr-4 pl-3 text-caption font-extrabold tracking-[0.2em] text-brand-700 uppercase shadow-sm backdrop-blur-sm dark:bg-white/10 dark:text-brand-200">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-400" />
              {t('app.tagline')}
            </p>
            <h1 className="mt-6 text-[clamp(2.25rem,6vw,4.75rem)] leading-[1.05] font-extrabold tracking-tight text-balance text-slate-900 dark:text-white">
              {t('home.title')}
            </h1>
            <p className="mt-5 max-w-prose text-lead text-slate-600 dark:text-slate-300">{t('home.lead')}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink to="/self-assessment" size="lg" className="shadow-xl shadow-brand-900/15 transition-transform duration-150 hover:-translate-y-0.5">
                {t('home.ctaAssess')}
              </ButtonLink>
              <ButtonLink to="/counsellors" size="lg" variant="secondary" className="bg-white/70 backdrop-blur-sm transition-transform duration-150 hover:-translate-y-0.5 dark:bg-white/5">
                {t('home.ctaFind')}
              </ButtonLink>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-caption text-slate-700 dark:text-slate-200">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 shadow-sm backdrop-blur-sm dark:bg-white/5">
                <EyeOff aria-hidden className="size-4 shrink-0 text-brand-600 dark:text-brand-300" />
                {t('home.anonBadgeShort')}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 shadow-sm backdrop-blur-sm dark:bg-white/5">
                <LockKeyhole aria-hidden className="size-4 shrink-0 text-brand-600 dark:text-brand-300" />
                {t('home.privacyTitle')}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 shadow-sm backdrop-blur-sm dark:bg-white/5">
                <Languages aria-hidden className="size-4 shrink-0 text-brand-600 dark:text-brand-300" />
                {fmt.number(3)} {t('home.statsLanguages')}
              </span>
            </div>
          </div>
          {/* Floating highlight card: the visual counterpart to the hero copy, standing in for
              a photo so the hero never depends on a remote image. */}
          <div className="relative hidden lg:block">
            <Tilt3D maxDeg={5} className="relative ml-auto w-64 rounded-2xl border border-white/60 bg-white/85 p-6 shadow-2xl backdrop-blur-md dark:border-white/15 dark:bg-slate-900/85">
              <span className="inline-flex size-12 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/60">
                <HeartHandshake aria-hidden className="size-6 text-brand-700 dark:text-brand-200" />
              </span>
              <p className="mt-4 text-[3.25rem] leading-none font-extrabold tracking-tight text-slate-900 dark:text-white">{fmt.number(174)}</p>
              <p className="mt-2 text-body-sm text-slate-600 dark:text-slate-300">{t('home.statsCounsellors')}</p>
              <p className="mt-4 border-t border-brand-900/10 pt-4 text-caption font-semibold tracking-wide text-brand-700 uppercase dark:border-white/15 dark:text-brand-300">
                {t('home.statsTitle')}
              </p>
            </Tilt3D>
          </div>
        </div>
      </section>

      {/* ---------- Emergency, kept visually separate from normal booking ---------- */}
      <section aria-labelledby="home-emergency" className="rounded-2xl border border-l-4 border-red-200 border-l-red-600 bg-red-50 p-5 dark:border-red-900 dark:border-l-red-600 dark:bg-red-950/60">
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
      <section aria-labelledby="home-quick" className="rounded-3xl bg-brand-50/70 p-5 backdrop-blur-[2px] sm:p-8 dark:bg-slate-900/60">
        <SectionNumber n="01" />
        <SectionHeader id="home-quick" title={t('home.quickCheckTitle')} lead={t('home.quickCheckLead')} />
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {ASSESSMENT_TYPES.map((type) => {
            const Icon = ASSESS_ICON[type]
            return (
              <Tilt3D key={type} as="li" maxDeg={6}>
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
              </Tilt3D>
            )
          })}
        </ul>
      </section>

      {/* ---------- Reassurance ---------- */}
      <section aria-labelledby="anon" className="grid gap-4 md:grid-cols-2">
        <Tilt3D maxDeg={5}>
          <Card>
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/60">
              <EyeOff aria-hidden className="size-6 text-brand-700 dark:text-brand-200" />
            </span>
            <h2 id="anon" className="mt-3 text-h3 text-slate-900 dark:text-white">
              {t('home.anonTitle')}
            </h2>
            <p className="mt-2 max-w-prose text-body text-slate-600 dark:text-slate-300">{t('home.anonBody')}</p>
          </Card>
        </Tilt3D>
        <Tilt3D maxDeg={5}>
          <Card>
            <span className="inline-flex size-11 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/60">
              <LockKeyhole aria-hidden className="size-6 text-brand-700 dark:text-brand-200" />
            </span>
            <h2 className="mt-3 text-h3 text-slate-900 dark:text-white">{t('home.privacyTitle')}</h2>
            <p className="mt-2 max-w-prose text-body text-slate-600 dark:text-slate-300">{t('home.privacyBody')}</p>
          </Card>
        </Tilt3D>
      </section>

      {/* ---------- A moment to breathe ---------- */}
      <div>
        <SectionNumber n="02" />
        <BreathingExercise />
      </div>

      {/* ---------- How it works ---------- */}
      <section aria-labelledby="how">
        <SectionNumber n="03" />
        <SectionHeader id="how" title={t('home.howTitle')} />
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <Tilt3D key={title} as="li" maxDeg={6} className={cn(cardSurface, "p-5")}>
              <div className="flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-brand-700 text-body-sm font-bold text-white dark:bg-brand-400 dark:text-slate-950">{i + 1}</span>
                <Icon aria-hidden className="size-6 text-brand-700 dark:text-brand-300" />
              </div>
              <h3 className="mt-3 text-h3 text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-1 text-body text-slate-600 dark:text-slate-300">{body}</p>
            </Tilt3D>
          ))}
        </ol>
      </section>

      {/* ---------- Find a counsellor: pre-fills the real search filters ---------- */}
      <section aria-labelledby="find" className="rounded-2xl border border-brand-200 bg-brand-50/70 p-5 backdrop-blur-[2px] sm:p-8 dark:border-brand-800 dark:bg-slate-900/80">
        <SectionNumber n="04" />
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
          <SectionNumber n="05" />
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
                <Tilt3D key={r.id} as="li" maxDeg={6}>
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
                </Tilt3D>
              )
            })}
          </ul>
        </section>
      )}

      {/* ---------- Reach ---------- */}
      <section aria-labelledby="stats" className="rounded-3xl border-y border-brand-900/10 bg-brand-50/70 py-10 backdrop-blur-[2px] sm:py-14 dark:border-white/10 dark:bg-slate-900/60">
        <div className="px-5 sm:px-8">
          <SectionNumber n="06" />
          <SectionHeader
            id="stats"
            title={
              <span className="flex items-center gap-2">
                <Languages aria-hidden className="size-6 text-brand-700 dark:text-brand-300" />
                {t('home.statsTitle')}
              </span>
            }
          />
        </div>
        <dl className="grid grid-cols-1 divide-y divide-brand-900/10 px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 dark:divide-white/10">
          {[
            [fmt.number(174), t('home.statsCounsellors')],
            [fmt.number(23), t('home.statsDistricts')],
            [fmt.number(3), t('home.statsLanguages')],
          ].map(([value, label]) => (
            <div key={label} className="px-2 py-6 text-center first:pl-0 last:pr-0 sm:py-0">
              <dt className="sr-only">{label}</dt>
              <dd>
                <p className="text-[clamp(2.75rem,5vw,4.25rem)] leading-none font-extrabold tracking-tight text-brand-700 dark:text-brand-300">{value}</p>
                <p className="mt-2 text-body-sm text-slate-600 dark:text-slate-300">{label}</p>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
