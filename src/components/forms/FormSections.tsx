import { Controller, type FieldValues, type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { OTHER_SPECIFY, type FieldDef, type SectionDef } from '../../config/forms'
import { pick } from '../../i18n'
import type { LanguageCode } from '../../types'
import { Checkbox, Input, RadioGroup, TextArea } from '../ui'

const OTHER_VALUES = ['other', 'others', 'otherRelatives']

function isVisible(field: FieldDef, values: Record<string, unknown>): boolean {
  if (!field.showIf) return true
  const v = values[field.showIf.field]
  return typeof v === 'string' && field.showIf.in.includes(v)
}

/** Drop answers to questions hidden by skip logic so stale values are never saved. */
export function visibleValues<T extends object>(sections: SectionDef[], values: T): T {
  const out: Record<string, unknown> = { ...(values as Record<string, unknown>) }
  for (const s of sections)
    for (const f of s.fields)
      if (!isVisible(f, values as Record<string, unknown>)) {
        out[f.name] = f.kind === 'checkboxes' ? [] : f.kind === 'number' ? null : ''
        if (f.otherField) out[f.otherField] = ''
      }
  return out as unknown as T
}

/** Renders Ministry form sections from config, with skip logic and "Other (specify)" fields. */
export function FormSections<T extends FieldValues>({ sections, form, readOnly }: { sections: SectionDef[]; form: UseFormReturn<T>; readOnly?: boolean }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as LanguageCode
  const values = form.watch() as Record<string, unknown>
  const errors = form.formState.errors as Record<string, { message?: string } | undefined>
  const req = (f: FieldDef) => (f.required ? t('errors.requiredField') : false)

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.id} aria-labelledby={`sec-${section.id}`} className="space-y-5">
          <h3 id={`sec-${section.id}`} className="border-b border-slate-200 pb-2 text-h3 dark:border-slate-700">
            {pick(section.title, lang)}
          </h3>
          <div className="grid gap-5 md:grid-cols-2">
            {section.fields.map((f) => {
              if (!isVisible(f, values)) return null
              const label = pick(f.label, lang)
              const wide = f.kind === 'textarea' || f.kind === 'radio' || f.kind === 'checkboxes'
              const name = f.name as never
              const err = errors[f.name]?.message
              const otherSelected = f.otherField && (Array.isArray(values[f.name]) ? (values[f.name] as string[]).some((v) => OTHER_VALUES.includes(v)) : OTHER_VALUES.includes(values[f.name] as string))
              return (
                <div key={f.name} className={wide ? 'md:col-span-2' : undefined}>
                  {f.kind === 'text' && <Input label={label} required={f.required} readOnly={readOnly} error={err} {...form.register(name, { required: req(f) })} />}
                  {f.kind === 'date' && <Input label={label} type="date" required={f.required} readOnly={readOnly} error={err} {...form.register(name, { required: req(f) })} />}
                  {f.kind === 'number' && (
                    <Input
                      label={label}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      required={f.required}
                      readOnly={readOnly}
                      error={err}
                      {...form.register(name, { required: req(f), setValueAs: (v: string) => (v === '' || v === null ? null : Number(v)) })}
                    />
                  )}
                  {f.kind === 'textarea' && <TextArea label={label} required={f.required} readOnly={readOnly} error={err} rows={4} {...form.register(name, { required: req(f) })} />}
                  {f.kind === 'radio' && (
                    <Controller
                      control={form.control}
                      name={name}
                      rules={{ required: req(f) }}
                      render={({ field, fieldState }) => (
                        <RadioGroup
                          name={f.name}
                          legend={label}
                          required={f.required}
                          disabled={readOnly}
                          value={(field.value as string) ?? ''}
                          onChange={field.onChange}
                          error={fieldState.error?.message}
                          options={f.options.map((o) => ({ value: o.value, label: pick(o.label, lang) }))}
                        />
                      )}
                    />
                  )}
                  {f.kind === 'checkboxes' && (
                    <Controller
                      control={form.control}
                      name={name}
                      render={({ field }) => {
                        const current = (field.value as string[] | undefined) ?? []
                        return (
                          <fieldset>
                            <legend className="mb-2 font-medium">{label}</legend>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {f.options.map((o) => (
                                <Checkbox
                                  key={o.value}
                                  label={pick(o.label, lang)}
                                  disabled={readOnly}
                                  checked={current.includes(o.value)}
                                  onChange={(e) => field.onChange(e.target.checked ? [...current, o.value] : current.filter((x) => x !== o.value))}
                                />
                              ))}
                            </div>
                          </fieldset>
                        )
                      }}
                    />
                  )}
                  {otherSelected && f.otherField && (
                    <Input label={`${label} — ${pick(OTHER_SPECIFY, lang)}`} readOnly={readOnly} wrapperClassName="mt-3" {...form.register(f.otherField as never)} />
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
