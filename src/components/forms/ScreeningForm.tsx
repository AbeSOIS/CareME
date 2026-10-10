import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { SCREENING_SECTIONS } from '../../config/forms'
import { useApiError } from '../../hooks/useApiError'
import { useFormat } from '../../hooks/useFormat'
import { casesApi } from '../../services/api'
import { useUi } from '../../store/ui'
import type { CaseRecord, ScreeningForm as Screening } from '../../types'
import { Button, Callout } from '../ui'
import { FormSections, visibleValues } from './FormSections'

export function emptyScreening(prefill: Partial<Screening> = {}): Screening {
  return {
    firstSessionLocation: '',
    firstSessionDate: new Date().toISOString().slice(0, 10),
    counsellorName: '',
    sex: '',
    age: null,
    dateOfBirth: '',
    province: '',
    district: '',
    dsDivision: '',
    gnDivision: '',
    religion: '',
    ethnicity: '',
    civilStatus: '',
    enoughMoneyForNecessities: '',
    mealsPerDay: '',
    attendsSchool: '',
    currentlyWorking: '',
    primaryOccupation: '',
    livingAlone: '',
    livingWith: [],
    advisedBy: [],
    cameAlone: '',
    presentingProblem: '',
    referredTo: [],
    actions: [],
    comments: '',
    ...prefill,
  }
}

/** Form A — Client Screening Form, saved against the case (FR-031). */
export function ScreeningForm({ record, prefill, onSaved, updatedAt }: { record: CaseRecord; prefill: Partial<Screening>; onSaved: (r: CaseRecord) => void; updatedAt?: string }) {
  const { t } = useTranslation()
  const fmt = useFormat()
  const toast = useUi((s) => s.toast)
  const apiError = useApiError()
  const form = useForm<Screening>({ defaultValues: record.screening ?? emptyScreening(prefill) })

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={form.handleSubmit(async (values) => {
        try {
          onSaved(await casesApi.saveScreening(record.id, visibleValues(SCREENING_SECTIONS, values)))
          form.reset(values)
          toast(t('case.formSaved'), 'success')
        } catch (e) {
          apiError.show(e)
        }
      })}
    >
      {!record.screening && <Callout tone="info">{t('case.notStarted')}</Callout>}
      <FormSections sections={SCREENING_SECTIONS} form={form} />
      <div className="sticky bottom-0 -mx-4 sm:-mx-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-5 dark:border-slate-700 dark:bg-slate-900/95">
        <span className="text-body-sm text-slate-600 dark:text-slate-400">{record.screening && updatedAt ? t('case.lastSaved', { time: fmt.dateTime(updatedAt) }) : ''}</span>
        <Button type="submit" loading={form.formState.isSubmitting}>
          {t('common.save')}
        </Button>
      </div>
    </form>
  )
}
