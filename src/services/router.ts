import type { Role, User } from '../types'

export type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

/** Who is calling — resolved from the bearer token on every request. */
export interface RequestContext {
  user?: User
  /** Effective roles; `['anonymous']` when not signed in. */
  roles: Role[]
  deviceSessionId?: string
}

export interface MockRequest<B = unknown> {
  params: Record<string, string>
  query: Record<string, string>
  body: B
  ctx: RequestContext
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Handler = (req: MockRequest<any>) => unknown

/** Error with an HTTP status and a stable code the UI translates (errors.<code>). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(status: number, code: string, details?: Record<string, unknown>) {
    super(code)
    this.status = status
    this.code = code
    this.details = details
  }
}

interface Route {
  method: Method
  pattern: RegExp
  keys: string[]
  handler: Handler
}

export class Router {
  private routes: Route[] = []

  on(method: Method, path: string, handler: Handler): this {
    const keys: string[] = []
    const pattern = new RegExp(
      '^' +
        path.replace(/:([A-Za-z]+)/g, (_, key: string) => {
          keys.push(key)
          return '([^/]+)'
        }) +
        '$',
    )
    this.routes.push({ method, pattern, keys, handler })
    return this
  }

  match(method: Method, path: string): { handler: Handler; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue
      const m = route.pattern.exec(path)
      if (!m) continue
      const params: Record<string, string> = {}
      route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])))
      return { handler: route.handler, params }
    }
    return null
  }
}
