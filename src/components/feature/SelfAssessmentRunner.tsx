import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Siren } from 'lucide-react'
import type { AssessmentTool } from '../../config/assessments'
import { scoreAssessment, type ScoreResult } from '../../domain/scoring'
import { Badge, Button, ButtonLink, Callout, Card, cn } from '../ui'

interface Props {
  tool: AssessmentTool
  /** Called with the result for registered users only; anonymous results are never passed anywhere. */
  onComplete?: (result: ScoreResult) => Promise<void> | void
  saved: boolean
}

const TONE_CLS = {
  good: 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950',
  mild: 'border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950',
  moderate: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950',
  severe: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950',
}

/**
 * Runs a self-assessment entirely in component state (FR-024–028).
 * Nothing is written to storage here; leaving the page discards the answers.
 */
export function SelfAssessmentRunner({ tool, onComplete, saved }: Props) {
  const { t, i18n } = useTranslation()
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [showMissing, setShowMissing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const answered = Object.keys(answers).length
  const total = tool.items.length
  const missing = useMemo(() => tool.items.filter((i) => answers[i.id] === undefined).map((i) => i.id), [answers, tool])

  const submit = async () => {
    if (missing.length) {
      setShowMissing(true)
      document.getElementById(`q-${missing[0]}`)?.focus()
      return
    }
    const r = scoreAssessment(tool, answers)
    setSubmitting(true)
    try {
      await onComplete?.(r)
    } finally {
      setSubmitting(false)
    }
    setResult(r)
    requestAnimationFrame(() => resultRef.current?.focus())
  }

  if (result) {
    return (
      <div className="space-y-6">
        <section className={cn('rounded-2xl border-2 p-6', TONE_CLS[result.band.tone])} aria-labelledby="result-title">
          <h2 id="result-title" ref={resultRef} tabIndex={-1} className="text-sm font-semibold tracking-wide uppercase focus:outline-none">
            {t('assess.resultTitle')}
          </h2>
          <p className="mt-2 text-3xl font-bold">{t(`assess.bands.${result.band.key}`)}</p>
          <p className="mt-1 text-slate-700 dark:text-slate-300">{t('assess.score', { score: result.score, max: tool.maxScore })}</p>
          <p className="mt-3">{t(`assess.bandAdvice.${result.band.tone}`)}</p>
          <p className="mt-3 text-sm font-medium">{saved ? t('assess.resultSaved') : t('assess.resultNotSaved')}</p>
        </section>

        {result.riskFlag && (
          <Callout tone="danger" title={t('assess.riskTitle')} role="alert">
            <p>{t('assess.riskBody')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ButtonLink to="/emergency" variant="emergency" icon={<Siren aria-hidden className="size-5" />}>
                {t('assess.nextEmergency')}
              </ButtonLink>
              <a href="tel:1926" className="inline-flex min-h-11 items-center rounded-lg border border-red-300 px-4 font-semibold">
                {t('emergency.call', { number: '1926' })}
              </a>
            </div>
          </Callout>
        )}

        <Card>
          <h2 className="text-lg font-semibold">{t('assess.whatNext')}</h2>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <ButtonLink to="/counsellors">{t('assess.nextBook')}</ButtonLink>
            <ButtonLink to="/resources" variant="secondary">
              {t('assess.nextResources')}
            </ButtonLink>
            <Button
              variant="ghost"
              onClick={() => {
                setAnswers({})
                setResult(null)
                setShowMissing(false)
              }}
            >
              {t('assess.retake')}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      className="space-y-5"
    >
      <p className="font-medium">{t(`assess.prompts.${tool.promptKey}`)}</p>
      {i18n.language !== 'en' && (
        <p className="text-sm text-amber-800 dark:text-amber-300">
          <Badge tone="warning">EN</Badge> {t('assess.itemsEnglishOnly')}
        </p>
      )}
      <ol className="space-y-4">
        {tool.items.map((item, idx) => {
          const isMissing = showMissing && answers[item.id] === undefined
          return (
            <li key={item.id}>
              <fieldset
                id={`q-${item.id}`}
                tabIndex={-1}
                aria-invalid={isMissing || undefined}
                className={cn(
                  'rounded-xl border bg-white p-4 dark:bg-slate-900',
                  isMissing ? 'border-red-500' : 'border-slate-200 dark:border-slate-700',
                )}
              >
                <legend className="sr-only">
                  {idx + 1}. {item.text}
                </legend>
                <p aria-hidden className="mb-3 font-medium" lang="en">
                  {idx + 1}. {item.text}
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {tool.options.map((opt) => {
                    const checked = answers[item.id] === opt.value
                    return (
                      <label
                        key={opt.value}
                        className={cn(
                          'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm',
                          checked ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950' : 'border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800',
                        )}
                      >
                        <input
                          type="radio"
                          name={item.id}
                          value={opt.value}
                          checked={checked}
                          onChange={() => setAnswers((a) => ({ ...a, [item.id]: opt.value }))}
                          className="size-5 shrink-0 accent-brand-700"
                        />
                        {t(`assess.options.${opt.labelKey}`)}
                      </label>
                    )
                  })}
                </div>
              </fieldset>
            </li>
          )
        })}
      </ol>
      <div className="sticky bottom-20 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900/95">
        <div className="flex-1">
          <p aria-live="polite" className="text-sm font-medium">
            {t('assess.progress', { answered, total })}
          </p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden>
            <div className="h-full bg-brand-600" style={{ width: `${(answered / total) * 100}%` }} />
          </div>
          {showMissing && missing.length > 0 && (
            <p role="alert" className="mt-1 text-sm font-medium text-red-700 dark:text-red-400">
              {t('assess.answerAll')}
            </p>
          )}
        </div>
        <Button type="submit" loading={submitting}>
          {t('assess.seeResult')}
        </Button>
      </div>
    </form>
  )
}
