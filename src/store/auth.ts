import { create } from 'zustand'
import { AxiosError } from 'axios'
import { authApi } from '../services/api'
import { http } from '../services/mockApi'
import type { AuthSession, Role, User } from '../types'

/** Token lives in sessionStorage: closing the tab ends the session (no persistent login on shared devices). */
const SESSION_KEY = 'careme:session'

function readSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as AuthSession) : null
  } catch {
    return null
  }
}

function writeSession(session: AuthSession | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // ignore
  }
}

interface AuthState {
  session: AuthSession | null
  /** Why the last session ended, shown on the login page. */
  endedReason: 'timeout' | 'revoked' | 'expired' | null
  user: () => User | null
  roles: () => Role[]
  hasRole: (...roles: Role[]) => boolean
  setSession: (session: AuthSession) => void
  updateUser: (user: User) => void
  refresh: () => Promise<void>
  logout: (reason?: AuthState['endedReason']) => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  session: readSession(),
  endedReason: null,
  user: () => get().session?.user ?? null,
  roles: () => get().session?.effectiveRoles ?? ['anonymous'],
  hasRole: (...roles) => roles.some((r) => get().roles().includes(r)),
  setSession: (session) => {
    writeSession(session)
    set({ session, endedReason: null })
  },
  updateUser: (user) => {
    const session = get().session
    if (!session) return
    const next = { ...session, user }
    writeSession(next)
    set({ session: next })
  },
  /** Re-read roles (e.g. the Emergency Officer rota changed). */
  refresh: async () => {
    if (!get().session) return
    const { user, effectiveRoles } = await authApi.me()
    const next = { ...get().session!, user, effectiveRoles }
    writeSession(next)
    set({ session: next })
  },
  logout: async (reason = null) => {
    if (get().session && reason === null) {
      try {
        await authApi.logout()
      } catch {
        // already invalid
      }
    }
    writeSession(null)
    set({ session: null, endedReason: reason })
  },
}))

http.interceptors.request.use((config) => {
  const token = useAuth.getState().session?.token
  if (token) config.headers.set('Authorization', `Bearer ${token}`)
  return config
})

http.interceptors.response.use(undefined, (error: unknown) => {
  if (error instanceof AxiosError && error.response?.status === 401) {
    const code = (error.response.data as { code?: string })?.code
    if (code === 'sessionRevoked' || code === 'sessionExpired') void useAuth.getState().logout(code === 'sessionRevoked' ? 'revoked' : 'expired')
  }
  return Promise.reject(error)
})
