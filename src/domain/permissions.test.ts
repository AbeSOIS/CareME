import { describe, expect, it } from 'vitest'
import { can, DEFAULT_PERMISSIONS, scopeFor } from './permissions'

describe('permission matrix', () => {
  it('denies anything not granted', () => {
    expect(can(DEFAULT_PERMISSIONS, ['admin'], 'sessionNotes', 'view')).toBe(false)
    expect(can(DEFAULT_PERMISSIONS, ['analyst'], 'beneficiaryProfile', 'view')).toBe(false)
    expect(can(DEFAULT_PERMISSIONS, ['anonymous'], 'selfAssessmentResults', 'create')).toBe(false)
  })
  it('limits counsellors to their own cases', () => {
    expect(scopeFor(DEFAULT_PERMISSIONS, ['counsellor'], 'screeningRecords', 'view')).toBe('own')
    expect(can(DEFAULT_PERMISSIONS, ['counsellor'], 'screeningRecords', 'view', 'all')).toBe(false)
  })
  it('takes the broadest scope across roles', () => {
    expect(scopeFor(DEFAULT_PERMISSIONS, ['counsellor', 'emergencyOfficer'], 'emergencyAlerts', 'view')).toBe('all')
  })
  it('keeps analysts on aggregates', () => {
    expect(scopeFor(DEFAULT_PERMISSIONS, ['analyst'], 'reports', 'view')).toBe('aggregate')
    expect(can(DEFAULT_PERMISSIONS, ['analyst'], 'emergencyAlerts', 'view', 'own')).toBe(false)
  })
})
