import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EyeOff, Siren } from 'lucide-react'
import type { AssessmentTool } from '../../config/assessments'
import { EMERGENCY_NUMBERS } from '../../config/defaults'
import { scoreAssessment, type ScoreResult } from '../../domain/scoring'
import { Badge, Button, ButtonLink, Callout, Card, cn } from '../ui'

interface Props {
  tool: AssessmentTool
  /** Called with the result for registered users only; anonymous results are never passed anywhere. */
  onComplete?: (result: ScoreResult) => Promise<void> | void
  saved: boolean
}

const TONE_CLS = {
  good: 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950',
  mild: 'border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-950',
  moderate: 'border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950',
  severe: 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950',
}

/** The mental-health helpline, read from config rather than written into the markup. */
const HELPLINE = EMERGENCY_NUMBERS.find((n) => n.key === 'mentalHealthHelpline') ?? EMERGENCY_NUMBERS[0]

/**
 * Runs a self-assessment entirely in component state (FR-024–028).
 * Nothing is written to storage here; leaving the page discards the answers.
 *
 * One question per screen: the audience is often on a small phone, sometimes
 * distressed, so a single question with large targets beats a long scroll.
 * Skipping forward is allowed, and the completeness gate still runs on submit —
 * it jumps back to the first unanswered question rather than silently scoring.
 */
export function SelfAssessmentRunner({ tool, onComplete, saved }: Props) {
  const { t, i18n } = useTranslation()
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [index, setIndex] = useState(0)
  const [result, setResult] = useState<ScoreResult | null>(null)
  const [showMissing, setShowMissing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const resultRef = useRef<HTMLHeadingElement>(null)
  const questionRef = useRef<HTMLFieldSetElement>(null)

  const total = tool.items.length
  const answered = Object.keys(answers).length
  const missing = useMemo(() => tool.items.filter((i) => answers[i.id] === undefined).map((i) => i.id), [answers, tool])
  const item = tool.items[index]
  const isLast = index === total - 1
  const current = answers[item.id]

  const goTo = (next: number) => {
    setIndex(next)
    requestAnimationFrame(() => questionRef.current?.focus())
  }

  const submit = async () => {
    if (missing.length) {
      // Same gate as before: never score a partial questionnaire.
      setShowMissing(true)
      goTo(tool.items.findIndex((i) => i.id === missing[0]))
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
          <h2 id="result-title" ref={resultRef} tabIndex={-1} className="text-caption font-semibold tracking-wide uppercase focus:outline-none">
            {t('assess.resultTitle')}
          </h2>
          <p className="mt-2 text-h1 text-slate-900 dark:text-white">{t(`assess.bands.${result.band.key}`)}</p>
          <p className="mt-1 text-body text-slate-700 dark:text-slate-200">{t('assess.score', { score: result.score, max: tool.maxScore })}</p>
          <p className="mt-3 max-w-prose text-body">{t(`assess.bandAdvice.${result.band.tone}`)}</p>
          <p className="mt-4 inline-flex items-center gap-2 text-body-sm font-medium">
            <EyeOff aria-hidden className="size-4 shrink-0" />
            {saved ? t('assess.resultSaved') : t('assess.resultNotSaved')}
          </p>
        </section>

        {result.riskFlag && (
          <Callout tone="danger" title={t('assess.riskTitle')} role="alert">
            <p>{t('assess.riskBody')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ButtonLink to="/emergency" variant="emergency" icon={<Siren aria-hidden className="size-5" />}>
                {t('assess.nextEmergency')}
              </ButtonLink>
              <a
                href={`tel:${HELPLINE.number}`}
                className="inline-flex min-h-11 items-center rounded-xl border border-red-300 px-4 text-body font-semibold dark:border-red-700"
              >
                {t('emergency.call', { number: HELPLINE.number })}
              </a>
            </div>
          </Callout>
        )}

        <Card>
          <h2 className="text-h3 text-slate-900 dark:text-white">{t('assess.whatNext')}</h2>
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
                setIndex(0)
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
        if (isLast) void submit()
        else goTo(index + 1)
      }}
      className="space-y-5"
    >
      {/* Progress: a number as well as a bar, so it is not colour/length alone. */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p aria-live="polite" className="text-body-sm font-semibold text-brand-800 dark:text-brand-200">
            {t('assess.questionOf', { current: index + 1, total })}
          </p>
          <p className="inline-flex items-center gap-2 text-caption text-slate-600 dark:text-slate-300">
            <EyeOff aria-hidden className="size-4 shrink-0" />
            {t('assess.answersNotSaved')}
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden>
          <div className="h-full bg-brand-600 transition-[width] duration-150 dark:bg-brand-400" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
      </div>

      <p className="max-w-prose text-body text-slate-600 dark:text-slate-300">{t(`assess.prompts.${tool.promptKey}`)}</p>
      {i18n.language !== 'en' && (
        <p className="flex items-center gap-2 text-body-sm text-amber-800 dark:text-amber-300">
          <Badge tone="warning">EN</Badge> {t('assess.itemsEnglishOnly')}
        </p>
      )}

      <fieldset
        key={item.id}
        ref={questionRef}
        tabIndex={-1}
        aria-invalid={showMissing && current === undefined ? true : undefined}
        className={cn(
          'rounded-2xl border bg-white p-5 focus:outline-none dark:bg-slate-900',
          showMissing && current === undefined ? 'border-red-500' : 'border-slate-200 dark:border-slate-700',
        )}
      >
        <legend className="sr-only">{item.text}</legend>
        <p aria-hidden className="text-h3 text-slate-900 dark:text-white" lang="en">
          {item.text}
        </p>
        <div className="mt-4 grid gap-2">
          {tool.options.map((opt) => {
            const checked = current === opt.value
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex min-h-13 w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-body transition-colors duration-150',
                  checked
                    ? 'border-brand-600 bg-brand-50 font-semibold dark:border-brand-400 dark:bg-brand-950'
                    : 'border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800',
                )}
              >
                <input
                  type="radio"
                  name={item.id}
                  value={opt.value}
                  checked={checked}
                  onChange={() => setAnswers((a) => ({ ...a, [item.id]: opt.value }))}
                  className="size-5 shrink-0 accent-brand-700 dark:accent-brand-400"
                />
                {t(`assess.options.${opt.labelKey}`)}
              </label>
            )
          })}
        </div>
        {showMissing && current === undefined && (
          <p role="alert" className="mt-3 text-body-sm font-medium text-red-700 dark:text-red-400">
            {t('assess.skipped')}
          </p>
        )}
      </fieldset>

      {showMissing && missing.length > 0 && (
        <p role="alert" className="text-body-sm font-medium text-red-700 dark:text-red-400">
          {t('assess.answerAll')} {t('assess.progress', { answered, total })}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="secondary" size="lg" disabled={index === 0} onClick={() => goTo(index - 1)}>
          {t('common.back')}
        </Button>
        <Button type="submit" size="lg" loading={submitting}>
          {isLast ? t('assess.seeResult') : t('common.next')}
        </Button>
      </div>
    </form>
  )
}
