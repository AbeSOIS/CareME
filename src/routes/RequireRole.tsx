import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { ForbiddenPage } from '../pages/public/ForbiddenPage'
import { useAuth } from '../store/auth'
import type { Role } from '../types'

/**
 * Role guard. Not signed in → /login (returning here afterwards).
 * Signed in without the role → 403 page. The mock API enforces the same rules server-side.
 */
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const session = useAuth((s) => s.session)
  const location = useLocation()
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (!roles.some((r) => session.effectiveRoles.includes(r))) return <ForbiddenPage />
  return <>{children}</>
}
