import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { errorCode } from '../services/mockApi'
import { useUi } from '../store/ui'

/** Translate an API error to a user message and show it as a toast. */
export function useApiError() {
  const { t } = useTranslation()
  const toast = useUi((s) => s.toast)
  const message = useCallback((err: unknown) => t(`errors.${errorCode(err)}`, { defaultValue: t('errors.unknown') }), [t])
  const show = useCallback((err: unknown) => toast(message(err), 'error'), [message, toast])
  return useMemo(() => ({ message, show }), [message, show])
}
