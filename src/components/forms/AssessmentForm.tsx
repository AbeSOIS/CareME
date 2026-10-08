import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ASSESSMENT_DRAFT_NOTE, FUNCTIONING_SECTION, SUBSTANCE_SECTION, SYMPTOM_SECTION, YES_NO_CHOICES } from '../../config/forms'
import { pick } from '../../i18n'
import { useApiError } from '../../hooks/useApiError'
import { useFormat } from '../../hooks/useFormat'
import { casesApi } from '../../services/api'
import { useUi } from '../../store/ui'
import type { AssessmentForm as Assessment, CaseRecord, LanguageCode } from '../../types'
import { Badge, Button, Callout, Input, RadioGroup, TextArea, cn } from '../ui'
import { RatingScale, scaleTotal } from './RatingScale'

type Draft = Omit<Assessment, 'id'> & { id?: string }

function emptyAssessment(counsellorName: string): Draft {
  return { date: new Date().toISOString().slice(0, 10), counsellorName, substanceUse: {}, symptoms: {}, functioning: {} }
}

/** Assessment Form (තක්සේරු කිරීමේ පෝරමය): sections ඈ substance use, ඉ symptom frequency, ඊ functioning. */
export function AssessmentForm({ record, counsellorName, onSaved }: { record: CaseRecord; counsellorName: string; onSaved: (r: CaseRecord) => void }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as LanguageCode
  const fmt = useFormat()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const [draft, setDraft] = useState<Draft>(() => record.assessments[record.assessments.length - 1] ?? emptyAssessment(counsellorName))
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    try {
      const saved = draft.id ? await casesApi.updateAssessment(record.id, draft as Assessment) : await casesApi.addAssessment(record.id, draft)
      onSaved(saved)
      setDraft(draft.id ? draft : saved.assessments[saved.assessments.length - 1])
      toast(t('case.formSaved'), 'success')
    } catch (e) {
      apiError.show(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-8">
      {lang !== 'si' && <Callout tone="warning">{pick(ASSESSMENT_DRAFT_NOTE, lang)}</Callout>}

      <section aria-labelledby="as-list" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="as-list" className="font-semibold">
            {t('case.assessmentList')}
          </h3>
          <Button size="sm" variant="secondary" icon={<Plus aria-hidden className="size-4" />} onClick={() => setDraft(emptyAssessment(counsellorName))}>
            {t('case.newAssessment')}
          </Button>
        </div>
        {record.assessments.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {record.assessments.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  aria-pressed={draft.id === a.id}
                  onClick={() => setDraft(a)}
                  className={cn('min-h-11 rounded-lg border px-3 text-sm', draft.id === a.id ? 'border-brand-600 bg-brand-50 dark:bg-brand-950' : 'border-slate-300 dark:border-slate-600')}
                >
                  {fmt.date(a.date)} · <Badge>{scaleTotal(a.symptoms as Record<string, string>, SYMPTOM_SECTION.options)}/30</Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label={t('common.date')} type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        <Input label={t('reports.counsellor')} value={draft.counsellorName} onChange={(e) => setDraft({ ...draft, counsellorName: e.target.value })} />
      </div>

      <section aria-labelledby="sec-a" className="space-y-4">
        <h3 id="sec-a" className="border-b border-slate-200 pb-2 text-lg font-semibold dark:border-slate-700">
          {pick(SUBSTANCE_SECTION.title, lang)}
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {SUBSTANCE_SECTION.items.map((item) => {
            const props = {
              label: pick(item.label, lang),
              value: draft.substanceUse[item.id] ?? '',
              onChange: (e: { target: { value: string } }) => setDraft({ ...draft, substanceUse: { ...draft.substanceUse, [item.id]: e.target.value } }),
            }
            return (
              <div key={item.id} className={cn(item.long && 'md:col-span-2', item.sub && 'md:pl-6')}>
                {item.long ? <TextArea rows={3} {...props} /> : <Input {...props} />}
              </div>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="sec-e" className="space-y-4">
        <h3 id="sec-e" className="border-b border-slate-200 pb-2 text-lg font-semibold dark:border-slate-700">
          {pick(SYMPTOM_SECTION.title, lang)}
        </h3>
        <RatingScale
          name={`s-${draft.id ?? 'new'}`}
          label={pick(SYMPTOM_SECTION.title, lang)}
          items={SYMPTOM_SECTION.items}
          options={SYMPTOM_SECTION.options}
          value={draft.symptoms as Record<string, string>}
          onChange={(item, v) => setDraft({ ...draft, symptoms: { ...draft.symptoms, [item]: v as Assessment['symptoms'][string] } })}
        />
        <p className="text-sm font-medium">
          {t('case.symptomTotal')}: {scaleTotal(draft.symptoms as Record<string, string>, SYMPTOM_SECTION.options)}/30
        </p>
      </section>

      <section aria-labelledby="sec-f" className="space-y-4">
        <h3 id="sec-f" className="border-b border-slate-200 pb-2 text-lg font-semibold dark:border-slate-700">
          {pick(FUNCTIONING_SECTION.title, lang)}
        </h3>
        {FUNCTIONING_SECTION.items.map((item) => {
          const v = draft.functioning[item.id] ?? { answer: '', details: '' }
          const set = (patch: Partial<typeof v>) => setDraft({ ...draft, functioning: { ...draft.functioning, [item.id]: { ...v, ...patch } } })
          return (
            <div key={item.id} className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <RadioGroup
                name={`${item.id}-${draft.id ?? 'new'}`}
                legend={pick(item.label, lang)}
                inline
                value={v.answer}
                onChange={(answer) => set({ answer: answer as 'yes' | 'no' })}
                options={YES_NO_CHOICES.map((o) => ({ value: o.value, label: pick(o.label, lang) }))}
              />
              {v.answer === 'yes' && <TextArea label={t('common.details')} rows={2} value={v.details} onChange={(e) => set({ details: e.target.value })} />}
            </div>
          )
        })}
      </section>

      <div className="sticky bottom-0 -mx-5 flex justify-end border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
        <Button onClick={save} loading={busy}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  )
}
