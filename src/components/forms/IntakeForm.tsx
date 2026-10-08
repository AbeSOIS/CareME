import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  BEHAVIOURAL_ITEMS,
  BEHAVIOURAL_TITLE,
  EMOTIONAL_ITEMS,
  EMOTIONAL_TITLE,
  INTAKE_SECTIONS,
  PROBLEM_SCALE_OPTIONS,
  RATING_SCALE_TITLE,
} from '../../config/forms'
import { newId } from '../../domain/ids'
import { pick } from '../../i18n'
import { useApiError } from '../../hooks/useApiError'
import { useFormat } from '../../hooks/useFormat'
import { casesApi } from '../../services/api'
import { useUi } from '../../store/ui'
import type { CaseRecord, IntakeForm as Intake, LanguageCode, ProblemRating } from '../../types'
import { Badge, Button, Input, Select, cn } from '../ui'
import { FormSections, visibleValues } from './FormSections'
import { RatingScale, scaleTotal } from './RatingScale'

function emptyRating(kind: ProblemRating['kind']): ProblemRating {
  return { id: newId('pr'), kind, date: new Date().toISOString().slice(0, 10), emotional: {}, behavioural: {} }
}

export function emptyIntake(counsellorName: string): Intake {
  return {
    sessionLocation: '',
    date: new Date().toISOString().slice(0, 10),
    counsellorName,
    presentingProblem: '',
    additionalProblems: '',
    personalHistory: '',
    strengthsAndResources: '',
    familyStructure: '',
    socialSupport: '',
    barriersToCounselling: '',
    clientActions: '',
    overallHealth: '',
    hasMedicalProblems: '',
    pastSubstanceProblem: '',
    currentAlcoholProblem: '',
    currentDrugProblem: '',
    ratings: [emptyRating('intake')],
  }
}

/** Form B — Client Intake Form: sections C–D plus the Problem Rating Scale (E, F) at intake and each follow-up. */
export function IntakeForm({ record, counsellorName, onSaved }: { record: CaseRecord; counsellorName: string; onSaved: (r: CaseRecord) => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as LanguageCode
  const fmt = useFormat()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const initial = record.intake ?? emptyIntake(counsellorName)
  const form = useForm<Intake>({ defaultValues: initial })
  const [ratings, setRatings] = useState<ProblemRating[]>(initial.ratings.length ? initial.ratings : [emptyRating('intake')])
  const [activeId, setActiveId] = useState(ratings[ratings.length - 1].id)
  const active = ratings.find((r) => r.id === activeId) ?? ratings[0]
  const updateActive = (patch: Partial<ProblemRating>) => setRatings((list) => list.map((r) => (r.id === active.id ? { ...r, ...patch } : r)))

  const totals = ratings.map((r) => ({
    r,
    e: scaleTotal(r.emotional as Record<string, string>, PROBLEM_SCALE_OPTIONS),
    f: scaleTotal(r.behavioural as Record<string, string>, PROBLEM_SCALE_OPTIONS),
  }))

  return (
    <form
      noValidate
      className="space-y-8"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          const saved = await casesApi.saveIntake(record.id, { ...visibleValues(INTAKE_SECTIONS, values), ratings })
          onSaved(saved)
          form.reset(values)
          toast(t('case.formSaved'), 'success')
        } catch (e) {
          apiError.show(e)
        }
      })}
    >
      <FormSections sections={INTAKE_SECTIONS} form={form} />

      <section aria-labelledby="prs" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-2 dark:border-slate-700">
          <h3 id="prs" className="text-lg font-semibold">
            {pick(RATING_SCALE_TITLE, lang)}
          </h3>
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus aria-hidden className="size-4" />}
            onClick={() => {
              const r = emptyRating('followUp')
              setRatings((list) => [...list, r])
              setActiveId(r.id)
            }}
          >
            {t('case.addRating')}
          </Button>
        </div>

        <div className="relative overflow-x-auto">
          <table className="w-full min-w-96 text-sm">
            <caption className="sr-only">{t('case.compare')}</caption>
            <thead>
              <tr className="text-left text-slate-600 dark:text-slate-300">
                <th scope="col" className="py-1 pr-3">{t('case.ratingKind')}</th>
                <th scope="col" className="py-1 pr-3">{t('common.date')}</th>
                <th scope="col" className="py-1 pr-3">{t('case.emotionalTotal')} /30</th>
                <th scope="col" className="py-1 pr-3">{t('case.behaviouralTotal')} /18</th>
                <th scope="col" className="py-1"><span className="sr-only">{t('common.edit')}</span></th>
              </tr>
            </thead>
            <tbody>
              {totals.map(({ r, e, f }) => (
                <tr key={r.id} className={cn('border-t border-slate-200 dark:border-slate-700', r.id === active.id && 'bg-brand-50 dark:bg-brand-950')}>
                  <td className="py-2 pr-3">
                    <Badge tone={r.kind === 'intake' ? 'brand' : 'info'}>{r.kind === 'intake' ? t('case.intake') : t('case.followUp')}</Badge>
                  </td>
                  <td className="py-2 pr-3">{fmt.date(r.date)}</td>
                  <td className="py-2 pr-3 font-semibold tabular-nums">{e}</td>
                  <td className="py-2 pr-3 font-semibold tabular-nums">{f}</td>
                  <td className="py-2 text-right">
                    <Button size="sm" variant="ghost" aria-pressed={r.id === active.id} onClick={() => setActiveId(r.id)}>
                      {t('common.edit')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('case.ratingKind')}
            value={active.kind}
            onChange={(e) => updateActive({ kind: e.target.value as ProblemRating['kind'] })}
            options={[
              { value: 'intake', label: t('case.intake') },
              { value: 'followUp', label: t('case.followUp') },
            ]}
          />
          <Input label={t('common.date')} type="date" value={active.date} onChange={(e) => updateActive({ date: e.target.value })} />
        </div>

        <h4 className="font-semibold">{pick(EMOTIONAL_TITLE, lang)}</h4>
        <RatingScale
          name={`e-${active.id}`}
          label={pick(EMOTIONAL_TITLE, lang)}
          items={EMOTIONAL_ITEMS}
          options={PROBLEM_SCALE_OPTIONS}
          value={active.emotional as Record<string, string>}
          onChange={(item, v) => updateActive({ emotional: { ...active.emotional, [item]: v as ProblemRating['emotional'][string] } })}
        />
        <h4 className="font-semibold">{pick(BEHAVIOURAL_TITLE, lang)}</h4>
        <RatingScale
          name={`f-${active.id}`}
          label={pick(BEHAVIOURAL_TITLE, lang)}
          items={BEHAVIOURAL_ITEMS}
          options={PROBLEM_SCALE_OPTIONS}
          value={active.behavioural as Record<string, string>}
          onChange={(item, v) => updateActive({ behavioural: { ...active.behavioural, [item]: v as ProblemRating['behavioural'][string] } })}
        />
      </section>

      <div className="sticky bottom-0 -mx-5 flex justify-end border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <Button type="submit" loading={form.formState.isSubmitting}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  )
}
