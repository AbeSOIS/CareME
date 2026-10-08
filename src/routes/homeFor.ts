import type { Role } from '../types'

/** Landing page after login for a set of roles. */
export function homeFor(roles: readonly Role[]): string {
  if (roles.includes('counsellor') || roles.includes('emergencyOfficer')) return '/counsellor'
  if (roles.includes('admin')) return '/admin/dashboard'
  if (roles.includes('analyst')) return '/admin/dashboard'
  if (roles.includes('beneficiary')) return '/me'
  return '/'
}
