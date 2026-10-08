import { ClipboardCheck, EyeOff, HeartHandshake, Languages, LockKeyhole, Siren, Video } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ButtonLink, Card } from '../../components/ui'
import { useFormat } from '../../hooks/useFormat'

export function HomePage() {
  const { t } = useTranslation()
  const fmt = useFormat()
  const steps = [
    { icon: ClipboardCheck, title: t('home.how1Title'), body: t('home.how1Body') },
    { icon: HeartHandshake, title: t('home.how2Title'), body: t('home.how2Body') },
    { icon: Video, title: t('home.how3Title'), body: t('home.how3Body') },
  ]
  return (
    <div className="space-y-12">
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-sky-800 px-6 py-12 text-white sm:px-10 sm:py-16 dark:from-brand-900 dark:to-sky-950">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-brand-100 uppercase">{t('app.tagline')}</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">{t('home.title')}</h1>
          <p className="mt-4 text-lg text-brand-50">{t('home.lead')}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <ButtonLink to="/self-assessment" size="lg" variant="onDark">
              {t('home.ctaAssess')}
            </ButtonLink>
            <ButtonLink to="/counsellors" size="lg" variant="outlineOnDark">
              {t('home.ctaFind')}
            </ButtonLink>
            <ButtonLink to="/emergency" size="lg" variant="emergency" icon={<Siren aria-hidden className="size-5" />}>
              {t('home.ctaEmergency')}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section aria-labelledby="anon" className="grid gap-4 md:grid-cols-2">
        <Card>
          <EyeOff aria-hidden className="size-7 text-brand-700 dark:text-brand-300" />
          <h2 id="anon" className="mt-3 text-xl font-semibold">
            {t('home.anonTitle')}
          </h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">{t('home.anonBody')}</p>
        </Card>
        <Card>
          <LockKeyhole aria-hidden className="size-7 text-brand-700 dark:text-brand-300" />
          <h2 className="mt-3 text-xl font-semibold">{t('home.privacyTitle')}</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">{t('home.privacyBody')}</p>
        </Card>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="text-2xl font-bold">
          {t('home.howTitle')}
        </h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-900 dark:bg-brand-900 dark:text-brand-100">{i + 1}</span>
                <Icon aria-hidden className="size-6 text-brand-700 dark:text-brand-300" />
              </div>
              <h3 className="mt-3 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="stats" className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
        <h2 id="stats" className="flex items-center gap-2 text-xl font-semibold">
          <Languages aria-hidden className="size-6 text-brand-700 dark:text-brand-300" />
          {t('home.statsTitle')}
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            [fmt.number(174), t('home.statsCounsellors')],
            [fmt.number(23), t('home.statsDistricts')],
            [fmt.number(3), t('home.statsLanguages')],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl bg-brand-50 p-4 dark:bg-slate-800">
              <dt className="text-sm text-slate-700 dark:text-slate-300">{label}</dt>
              <dd className="text-3xl font-bold text-brand-900 dark:text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
