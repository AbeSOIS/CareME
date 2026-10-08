import { beforeEach, describe, expect, it } from 'vitest'
import { installMemoryStorage } from '../test/memoryStorage'
import { DEMO_OTP, DEMO_PASSWORD } from '../config/defaults'
import type { AppointmentView, AuthSession, SearchResult } from '../types'

const storage = installMemoryStorage()
const { http, errorCode } = await import('./mockApi')
const { resetDemoData, STORAGE_PREFIX } = await import('./storage')

async function login(username: string): Promise<string> {
  const res = await http.post('/auth/login', { username, password: DEMO_PASSWORD })
  if (res.data.mfaRequired) {
    const mfa = await http.post('/auth/mfa', { challengeId: res.data.challengeId, otp: DEMO_OTP })
    return (mfa.data as AuthSession).token
  }
  return (res.data as AuthSession).token
}
const as = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } })
const fail = async (p: Promise<unknown>) => {
  try {
    await p
  } catch (e) {
    return errorCode(e)
  }
  throw new Error('expected failure')
}

describe('mock API', () => {
  beforeEach(() => resetDemoData())

  it('seeds 174 counsellors across 23 districts', async () => {
    const res = await http.get('/counsellors')
    const all = JSON.parse(storage.getItem(`${STORAGE_PREFIX}counsellors`)!) as Array<{ districtId: string }>
    expect(all).toHaveLength(174)
    expect(new Set(all.map((c) => c.districtId)).size).toBe(23)
    expect(res.data.length).toBeGreaterThan(150)
  })

  it('locks an account after repeated failures and requires MFA for admins', async () => {
    for (let i = 0; i < 4; i++) expect(await fail(http.post('/auth/login', { username: 'ruwan@careme.gov.lk', password: 'x' }))).toBe('invalidCredentials')
    expect(await fail(http.post('/auth/login', { username: 'ruwan@careme.gov.lk', password: 'x' }))).toBe('accountLocked')
    const admin = await http.post('/auth/login', { username: 'admin@careme.gov.lk', password: DEMO_PASSWORD })
    expect(admin.data.mfaRequired).toBe(true)
  })

  it('falls back to a remote same-language counsellor where there is no local cover', async () => {
    const res = await http.get<SearchResult>('/counsellors/search', { params: { districtId: 'vavuniya', language: 'ta' } })
    expect(res.data.kind).toBe('remote')
    if (res.data.kind === 'remote') expect(res.data.offer.counsellor.languages).toContain('ta')
  })

  it('enforces the 8-session cap', async () => {
    const token = await login('sanduni@example.lk')
    const { data } = await http.get('/counsellors/c001')
    const code = await fail(http.post('/appointments', { counsellorId: 'c001', slotId: data.slots[0].id, mode: 'video', language: 'si', consent: true }, as(token)))
    expect(code).toBe('sessionCap')
  })

  it('requires guardian consent for a minor booking anonymously', async () => {
    const { data } = await http.get('/counsellors/c001')
    const details = { fullName: 'Test Child', phone: '0771234567', dateOfBirth: '2012-01-01' }
    const body = { counsellorId: 'c001', slotId: data.slots[0].id, mode: 'video', language: 'si', consent: true, details }
    expect(await fail(http.post('/appointments', body))).toBe('minorConsentRequired')
    const ok = await http.post('/appointments', {
      ...body,
      guardian: { guardianName: 'Parent', relationship: 'mother', guardianContact: '0771111111', authorityConfirmation: 'selfDeclared', consentGiven: true },
    })
    expect(ok.data.appointment.status).toBe('requested')
    expect(ok.data.session.user.roles).toEqual(['beneficiary'])
  })

  it('records a late cancellation only after explicit confirmation', async () => {
    const token = await login('nimali@example.lk')
    const mine = (await http.get<AppointmentView[]>('/appointments/mine', as(token))).data
    const soonest = mine
      .filter((a) => a.status === 'confirmed' && new Date(a.start) > new Date(Date.now() + 60 * 60 * 1000))
      .sort((a, b) => a.start.localeCompare(b.start))[0]
    expect(await fail(http.post(`/appointments/${soonest.id}/cancel`, {}, as(token)))).toBe('lateCancellation')
    const res = await http.post(`/appointments/${soonest.id}/cancel`, { confirmLate: true }, as(token))
    expect(res.data.status).toBe('lateCancelled')
  })

  it('routes an anonymous alert to the rostered officer who can acknowledge and close it', async () => {
    const raised = await http.post('/alerts', { message: 'help', contactPhone: '0770000000' })
    const officer = await login('dilini@careme.gov.lk')
    const queue = (await http.get('/alerts', as(officer))).data as Array<{ id: string; assignedOfficerUserId: string }>
    expect(queue.find((a) => a.id === raised.data.id)?.assignedOfficerUserId).toBe('u_c1')
    await http.post(`/alerts/${raised.data.id}/ack`, {}, as(officer))
    await http.post(`/alerts/${raised.data.id}/escalate`, {}, as(officer))
    await http.post(
      `/alerts/${raised.data.id}/outcome`,
      { psychologicalFirstAid: true, individualCounselling: false, referral: 'none', outcome: 'safe', summary: 'ok' },
      as(officer),
    )
    const status = (await http.get(`/alerts/${raised.data.id}/status`)).data
    expect(status).toMatchObject({ status: 'closed', acknowledged: true, escalated: true })
  })

  it('denies clinical records to admins and other counsellors', async () => {
    const admin = await login('admin@careme.gov.lk')
    const detail = (await http.get('/cases/case_b001', as(admin))).data
    expect(detail.record.notes).toEqual([])
    expect(detail.record.screening).toBeUndefined()
    const other = await login('tharshini@careme.gov.lk')
    expect(await fail(http.get('/cases/case_b001', as(other)))).toBe('forbidden')
    const beneficiary = await login('nimali@example.lk')
    expect(await fail(http.get('/admin/users', as(beneficiary)))).toBe('forbidden')
  })

  it('never persists anything for an anonymous self-assessment', async () => {
    const before = JSON.stringify(Object.fromEntries(Array.from({ length: storage.length }, (_, i) => [storage.key(i), storage.getItem(storage.key(i)!)])))
    expect(await fail(http.post('/self-assessments', { tool: 'stress', score: 10, bandKey: 'lowStress' }))).toBe('loginRequired')
    const after = JSON.stringify(Object.fromEntries(Array.from({ length: storage.length }, (_, i) => [storage.key(i), storage.getItem(storage.key(i)!)])))
    expect(after).toBe(before)
  })

  it('reproduces the Kalutara deck totals on the dashboard', async () => {
    const analyst = await login('analyst@careme.gov.lk')
    const res = await http.get('/reports/dashboard', { ...as(analyst), params: { districtId: 'kalutara', from: '2026-01', to: '2026-06' } })
    expect(res.data.kpis.individual).toBe(401)
    expect(res.data.kpis.group).toBe(29)
    expect(res.data.kpis.groupParticipants).toBe(482)
    expect(res.data.kpis.awareness).toBe(165)
  })
})
