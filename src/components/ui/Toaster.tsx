import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useUi } from '../../store/ui'
import { cn } from './cn'

/** Polite live region for toasts; errors are announced assertively. */
export function Toaster() {
  const { t } = useTranslation()
  const toasts = useUi((s) => s.toasts)
  const dismiss = useUi((s) => s.dismissToast)
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex flex-col items-center gap-2 px-4 sm:items-end">
      <div aria-live="polite" className="contents">
        {toasts
          .filter((x) => x.tone !== 'error')
          .map((x) => (
            <ToastItem key={x.id} tone={x.tone} message={x.message} onClose={() => dismiss(x.id)} closeLabel={t('common.close')} />
          ))}
      </div>
      <div aria-live="assertive" className="contents">
        {toasts
          .filter((x) => x.tone === 'error')
          .map((x) => (
            <ToastItem key={x.id} tone={x.tone} message={x.message} onClose={() => dismiss(x.id)} closeLabel={t('common.close')} />
          ))}
      </div>
    </div>
  )
}

function ToastItem({ tone, message, onClose, closeLabel }: { tone: 'success' | 'error' | 'info'; message: string; onClose: () => void; closeLabel: string }) {
  const Icon = tone === 'success' ? CircleCheck : tone === 'error' ? CircleAlert : Info
  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border p-3 shadow-lg',
        tone === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100',
        tone === 'error' && 'border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
        tone === 'info' && 'border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100',
      )}
    >
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <p className="flex-1 text-sm">{message}</p>
      <button type="button" onClick={onClose} aria-label={closeLabel} className="-m-1 inline-flex size-8 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10">
        <X aria-hidden className="size-4" />
      </button>
    </div>
  )
}
