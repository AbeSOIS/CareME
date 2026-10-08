import type { DataType, PermissionAction, PermissionMatrix, PermissionScope, Role } from '../types'

export const DATA_TYPES: DataType[] = [
  'beneficiaryProfile',
  'selfAssessmentResults',
  'screeningRecords',
  'intakeRecords',
  'assessmentRecords',
  'sessionNotes',
  'sessionHistory',
  'journalEntries',
  'moodEntries',
  'emergencyAlerts',
  'auditLog',
  'resourceContent',
  'systemConfiguration',
  'reports',
]

export const ACTIONS: PermissionAction[] = ['view', 'create', 'amend', 'delete']

export const ROLES: Role[] = ['anonymous', 'beneficiary', 'counsellor', 'emergencyOfficer', 'admin', 'analyst']

const own = 'own' as const
const all = 'all' as const
const agg = 'aggregate' as const

const CLINICAL_OWN = { view: own, create: own, amend: own }

/**
 * Draft least-privilege Role and Permission Matrix (stand-in for bid Annex 4).
 * Anything not listed is denied (SEC-008). Administrators deliberately have no
 * access to clinical records; Analysts see aggregates only.
 */
export const DEFAULT_PERMISSIONS: PermissionMatrix = {
  anonymous: {
    resourceContent: { view: all },
    emergencyAlerts: { create: own },
  },
  beneficiary: {
    beneficiaryProfile: { view: own, amend: own, delete: own },
    selfAssessmentResults: { view: own, create: own },
    sessionHistory: { view: own },
    journalEntries: { view: own, create: own, amend: own, delete: own },
    moodEntries: { view: own, create: own, amend: own },
    emergencyAlerts: { view: own, create: own },
    resourceContent: { view: all },
  },
  counsellor: {
    beneficiaryProfile: { view: own, create: own, amend: own },
    selfAssessmentResults: { view: own },
    screeningRecords: CLINICAL_OWN,
    intakeRecords: CLINICAL_OWN,
    assessmentRecords: CLINICAL_OWN,
    sessionNotes: CLINICAL_OWN,
    sessionHistory: { view: own, create: own },
    emergencyAlerts: { view: own, create: own },
    resourceContent: { view: all },
    reports: { view: agg },
  },
  emergencyOfficer: {
    beneficiaryProfile: { view: own },
    emergencyAlerts: { view: all, create: all, amend: all },
    resourceContent: { view: all },
  },
  admin: {
    beneficiaryProfile: { view: all, create: all, amend: all },
    sessionHistory: { view: all },
    emergencyAlerts: { view: all },
    auditLog: { view: all },
    resourceContent: { view: all, create: all, amend: all, delete: all },
    systemConfiguration: { view: all, amend: all },
    reports: { view: all },
  },
  analyst: {
    emergencyAlerts: { view: agg },
    resourceContent: { view: all },
    reports: { view: agg },
  },
}

const SCOPE_RANK: Record<PermissionScope, number> = { aggregate: 1, own: 2, all: 3 }

/** Broadest scope any of `roles` holds for the action, or null when denied. */
export function scopeFor(
  matrix: PermissionMatrix,
  roles: readonly Role[],
  dataType: DataType,
  action: PermissionAction,
): PermissionScope | null {
  let best: PermissionScope | null = null
  for (const role of roles) {
    const scope = matrix[role]?.[dataType]?.[action]
    if (scope && (!best || SCOPE_RANK[scope] > SCOPE_RANK[best])) best = scope
  }
  return best
}

/** True when the roles hold the permission at `minScope` or broader. */
export function can(
  matrix: PermissionMatrix,
  roles: readonly Role[],
  dataType: DataType,
  action: PermissionAction,
  minScope: PermissionScope = 'aggregate',
): boolean {
  const scope = scopeFor(matrix, roles, dataType, action)
  return scope !== null && SCOPE_RANK[scope] >= SCOPE_RANK[minScope]
}
