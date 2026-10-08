import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  error: unknown
  loading: boolean
  reload: () => Promise<void>
  setData: (value: T | ((prev: T | undefined) => T)) => void
}

/** Load data on mount / when deps change; ignores results from stale calls. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T>()
  const [error, setError] = useState<unknown>()
  const [loading, setLoading] = useState(true)
  const callId = useRef(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  const reload = useCallback(async () => {
    const id = ++callId.current
    setLoading(true)
    setError(undefined)
    try {
      const result = await run()
      if (id === callId.current) setData(result)
    } catch (e) {
      if (id === callId.current) setError(e)
    } finally {
      if (id === callId.current) setLoading(false)
    }
  }, [run])

  useEffect(() => {
    void reload()
  }, [reload])

  return { data, error, loading, reload, setData: setData as AsyncState<T>['setData'] }
}
