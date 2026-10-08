import axios, { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse } from 'axios'
import { registerAdmin } from './handlers/admin'
import { registerAlerts } from './handlers/alerts'
import { registerAuth } from './handlers/auth'
import { registerBooking } from './handlers/booking'
import { resolveContext } from './handlers/context'
import { registerCounsellor } from './handlers/counsellor'
import { registerReports } from './handlers/reports'
import { ApiError, Router, type Method } from './router'
import { ensureSeeded } from './storage'

/**
 * In-browser mock backend. `mockAdapter` turns every axios request into a call to a
 * local handler that reads and writes localStorage via `storage.ts`. To use a real
 * REST API (ARC-004), set VITE_API_BASE_URL and the adapter is skipped.
 */

const router = new Router()
registerAuth(router)
registerBooking(router)
registerCounsellor(router)
registerAlerts(router)
registerAdmin(router)
registerReports(router)

const LATENCY_MS = 180

const mockAdapter: AxiosAdapter = async (config) => {
  ensureSeeded()
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS))
  const url = new URL(config.url ?? '/', 'http://mock.local')
  const method = (config.method ?? 'get').toLowerCase() as Method
  const query: Record<string, string> = {}
  url.searchParams.forEach((v, k) => (query[k] = v))
  for (const [k, v] of Object.entries((config.params ?? {}) as Record<string, unknown>)) {
    if (v !== undefined && v !== null && v !== '') query[k] = String(v)
  }
  const body = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : (config.data ?? {})
  const headers = AxiosHeaders.from(config.headers)
  const auth = headers.get('Authorization')
  const token = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : undefined

  const respond = (status: number, data: unknown): AxiosResponse => ({
    data,
    status,
    statusText: String(status),
    headers: {},
    config,
    request: { mock: true },
  })

  try {
    const match = router.match(method, url.pathname)
    if (!match) throw new ApiError(404, 'notFound')
    const ctx = resolveContext(token)
    // Deep-copy so callers can never mutate the stored objects.
    const result = await match.handler({ params: match.params, query, body, ctx })
    return respond(200, result === undefined ? null : structuredClone(result))
  } catch (err) {
    const apiErr = err instanceof ApiError ? err : new ApiError(500, 'serverError')
    if (!(err instanceof ApiError)) console.error('[mockApi]', err)
    const response = respond(apiErr.status, { code: apiErr.code, details: apiErr.details })
    throw new AxiosError(apiErr.code, String(apiErr.status), config, response.request, response)
  }
}

const baseURL = import.meta.env.VITE_API_BASE_URL as string | undefined

export const http = axios.create({
  baseURL: baseURL ?? '/api',
  adapter: baseURL ? undefined : mockAdapter,
  headers: { 'Content-Type': 'application/json' },
})

/** Error code from an API failure, for `t('errors.<code>')`. */
export function errorCode(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { code?: string } | undefined
    return data?.code ?? 'network'
  }
  return 'unknown'
}

export function errorDetails(err: unknown): Record<string, unknown> | undefined {
  if (err instanceof AxiosError) return (err.response?.data as { details?: Record<string, unknown> } | undefined)?.details
  return undefined
}
