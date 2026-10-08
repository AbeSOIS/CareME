import { useId, type InputHTMLAttributes, type ReactNode, type Ref, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from './cn'

export const controlClass =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-500 focus-visible:border-brand-600 disabled:bg-slate-100 aria-[invalid=true]:border-red-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:disabled:bg-slate-800'

interface FieldShellProps {
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}

/** Label + hint + error wrapper. Errors are linked with aria-describedby (WCAG 3.3.1). */
export function FieldShell({ id, label, hint, error, required, children, className }: FieldShellProps) {
  const { t } = useTranslation()
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block font-medium text-slate-800 dark:text-slate-200">
        {label}
        {required ? (
          <span className="text-red-700 dark:text-red-400" aria-hidden>
            {' '}
            *
          </span>
        ) : (
          <span className="sr-only"> ({t('common.optional')})</span>
        )}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-slate-600 dark:text-slate-400">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}

function describedBy(id: string, hint?: ReactNode, error?: string) {
  return [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode
  hint?: ReactNode
  error?: string
  ref?: Ref<HTMLInputElement>
  wrapperClassName?: string
}

export function Input({ label, hint, error, id, required, className, wrapperClassName, ...rest }: InputProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <input
        id={fid}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        className={cn(controlClass, className)}
        {...rest}
      />
    </FieldShell>
  )
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: ReactNode
  hint?: ReactNode
  error?: string
  ref?: Ref<HTMLTextAreaElement>
  wrapperClassName?: string
}

export function TextArea({ label, hint, error, id, required, className, rows = 4, wrapperClassName, ...rest }: TextAreaProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <textarea
        id={fid}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        className={cn(controlClass, className)}
        {...rest}
      />
    </FieldShell>
  )
}

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: ReactNode
  options: SelectOption[]
  hint?: ReactNode
  error?: string
  placeholder?: string
  ref?: Ref<HTMLSelectElement>
  wrapperClassName?: string
}

export function Select({ label, options, hint, error, id, required, placeholder, className, wrapperClassName, ...rest }: SelectProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <FieldShell id={fid} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <select
        id={fid}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fid, hint, error)}
        className={cn(controlClass, 'pr-8', className)}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  description?: ReactNode
  ref?: Ref<HTMLInputElement>
}

export function Checkbox({ label, description, id, className, ...rest }: CheckboxProps) {
  const auto = useId()
  const fid = id ?? auto
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={fid}
        type="checkbox"
        aria-describedby={description ? `${fid}-desc` : undefined}
        className="mt-0.5 size-6 shrink-0 rounded border-slate-400 accent-brand-700 dark:accent-brand-400"
        {...rest}
      />
      <div>
        <label htmlFor={fid} className="font-medium text-slate-800 dark:text-slate-200">
          {label}
        </label>
        {description && (
          <p id={`${fid}-desc`} className="text-sm text-slate-600 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}

interface RadioGroupProps {
  name: string
  legend: ReactNode
  options: SelectOption[]
  value: string | undefined
  onChange: (value: string) => void
  required?: boolean
  error?: string
  inline?: boolean
  disabled?: boolean
}

/** Native radio group inside a fieldset — keyboard arrows work out of the box. */
export function RadioGroup({ name, legend, options, value, onChange, required, error, inline, disabled }: RadioGroupProps) {
  const auto = useId()
  return (
    <fieldset className="space-y-2" aria-describedby={error ? `${auto}-error` : undefined} aria-invalid={error ? true : undefined}>
      <legend className="mb-1 font-medium text-slate-800 dark:text-slate-200">
        {legend}
        {required && (
          <span className="text-red-700 dark:text-red-400" aria-hidden>
            {' '}
            *
          </span>
        )}
      </legend>
      <div className={cn('gap-2', inline ? 'flex flex-wrap' : 'grid sm:grid-cols-2')}>
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
              value === o.value
                ? 'border-brand-600 bg-brand-50 dark:border-brand-400 dark:bg-brand-950'
                : 'border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              disabled={disabled}
              className="size-5 shrink-0 accent-brand-700 dark:accent-brand-400"
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${auto}-error`} role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
    </fieldset>
  )
}
