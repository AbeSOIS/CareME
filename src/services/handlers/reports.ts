import { format, parseISO } from 'date-fns'
import { secondsToAcknowledge } from '../../domain/alerts'
import { ageGroupOf, ageOn } from '../../domain/age'
import { baselineStats, type StatRecord } from '../../data/stats'
import type { AgeGroup, AwarenessCategory, ID, SessionCategory } from '../../types'
import { type RequestContext, type Router } from '../router'
import { db } from '../storage'
import { permissionScope, requirePermission } from './context'

export const SESSION_CATEGORIES: SessionCategory[] = ['mentalDisorder', 'family', 'relationship', 'education', 'economic', 'drugRelated']
export const AWARENESS_CATEGORIES: AwarenessCategory[] = ['mentalDisorder', 'family', 'psychoSocial', 'educational', 'aswasuma', 'vocational', 'elder', 'mindfulness', 'disabled']

/** Platform activity converted into the same record shape, so reports need no manual consolidation (REP-009). */
function platformStats(): StatRecord[] {
  const counsellors = new Map(db.get('counsellors').map((c) => [c.id, c]))
  const beneficiaries = new Map(db.get('beneficiaries').map((b) => [b.id, b]))
  const cases = new Map(db.get('cases').map((c) => [c.beneficiaryId, c]))
  const out: StatRecord[] = []
  for (const a of db.get('appointments')) {
    if (a.status !== 'completed') continue
    const c = counsellors.get(a.counsellorId)
    const b = beneficiaries.get(a.beneficiaryId)
    const gender = b?.gender === 'male' || b?.gender === 'female' ? b.gender : undefined
    out.push({
      month: a.start.slice(0, 7),
      districtId: c?.districtId ?? 'kalutara',
      dsDivisionId: b?.dsDivisionId ?? c?.dsDivisionId,
      kind: 'individual',
      category: cases.get(a.beneficiaryId)?.primaryCategory ?? 'mentalDisorder',
      gender,
      ageGroup: b?.dateOfBirth ? ageGroupOf(ageOn(b.dateOfBirth, parseISO(a.start))) : undefined,
      source: 'platform',
    })
  }
  for (const g of db.get('groups')) {
    if (parseISO(g.start) > new Date()) continue
    const c = counsellors.get(g.counsellorId)
    out.push({
      month: g.start.slice(0, 7),
      districtId: c?.districtId ?? 'kalutara',
      dsDivisionId: g.dsDivisionId,
      kind: 'group',
      category: g.category,
      participants: Object.values(g.attendance).filter(Boolean).length,
      source: 'platform',
    })
  }
  return out
}

export interface StatFilters {
  districtId?: ID
  gender?: 'male' | 'female'
  ageGroup?: AgeGroup
  from?: string
  to?: string
}

export function filteredStats(f: StatFilters): StatRecord[] {
  return [...baselineStats(), ...platformStats()].filter((r) => {
    if (f.districtId && r.districtId !== f.districtId) return false
    if (f.from && r.month < f.from) return false
    if (f.to && r.month > f.to) return false
    // Gender and age group exist only on individual records; they filter those out without hiding groups/awareness.
    if (r.kind === 'individual') {
      if (f.gender && r.gender !== f.gender) return false
      if (f.ageGroup && r.ageGroup !== f.ageGroup) return false
    }
    return true
  })
}

function readFilters(query: Record<string, string>): StatFilters {
  return {
    districtId: query.districtId || undefined,
    gender: (query.gender as StatFilters['gender']) || undefined,
    ageGroup: (query.ageGroup as AgeGroup) || undefined,
    from: query.from || undefined,
    to: query.to || undefined,
  }
}

function countBy(rows: StatRecord[], key: (r: StatRecord) => string | undefined): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const k = key(r)
    if (k) out[k] = (out[k] ?? 0) + 1
  }
  return out
}

function identityAllowed(ctx: RequestContext): boolean {
  return permissionScope(ctx, 'emergencyAlerts', 'view') === 'all' && permissionScope(ctx, 'beneficiaryProfile', 'view') === 'all'
}

export function registerReports(r: Router): void {
  /** Dashboard (REP-007). Refreshed by the client every 15 minutes or on demand. */
  r.on('get', '/reports/dashboard', ({ ctx, query }) => {
    requirePermission(ctx, 'reports', 'view')
    const filters = readFilters(query)
    const rows = filteredStats(filters)
    const individual = rows.filter((x) => x.kind === 'individual')
    const group = rows.filter((x) => x.kind === 'group')
    const awareness = rows.filter((x) => x.kind === 'awareness')

    const divisionKey = (x: StatRecord) => (filters.districtId ? x.dsDivisionId : x.districtId)
    const divisions = [...new Set(individual.map(divisionKey).filter(Boolean) as string[])]
    const byDivision = divisions
      .map((d) => {
        const sub = individual.filter((x) => divisionKey(x) === d)
        return { id: d, total: sub.length, ...Object.fromEntries(SESSION_CATEGORIES.map((c) => [c, sub.filter((x) => x.category === c).length])) }
      })
      .sort((a, b) => b.total - a.total)

    const months = [...new Set(rows.map((x) => x.month))].sort()
    const byMonth = months.map((m) => ({
      month: m,
      individual: individual.filter((x) => x.month === m).length,
      group: group.filter((x) => x.month === m).length,
      awareness: awareness.filter((x) => x.month === m).length,
    }))

    const alerts = db.get('alerts')
    return {
      refreshedAt: new Date().toISOString(),
      kpis: {
        individual: individual.length,
        group: group.length,
        groupParticipants: group.reduce((s, x) => s + (x.participants ?? 0), 0),
        awareness: awareness.length,
        openAlerts: alerts.filter((a) => a.status !== 'closed').length,
        activeCounsellors: db.get('counsellors').filter((c) => c.active && (!filters.districtId || c.districtId === filters.districtId)).length,
      },
      byDivision,
      byMonth,
      byGender: countBy(individual, (x) => x.gender),
      byAgeGroup: countBy(individual, (x) => x.ageGroup),
      byCategory: countBy(individual, (x) => x.category),
      awarenessByCategory: countBy(awareness, (x) => x.category),
      divisionLevel: filters.districtId ? 'ds' : 'district',
    }
  })

  /** REP-001 Monthly Progress Report — the Kalutara deck layout, per DS division. */
  r.on('get', '/reports/monthly', ({ ctx, query }) => {
    requirePermission(ctx, 'reports', 'view')
    const month = query.month || format(new Date(), 'yyyy-MM')
    const districtId = query.districtId || 'kalutara'
    const rows = filteredStats({ districtId, from: month, to: month })
    const divisions = [...new Set(rows.map((x) => x.dsDivisionId ?? '—'))].sort()
    return {
      month,
      districtId,
      rows: divisions.map((d) => {
        const sub = rows.filter((x) => (x.dsDivisionId ?? '—') === d)
        const ind = sub.filter((x) => x.kind === 'individual')
        const grp = sub.filter((x) => x.kind === 'group')
        return {
          division: d,
          ...Object.fromEntries(SESSION_CATEGORIES.map((c) => [c, ind.filter((x) => x.category === c).length])),
          male: ind.filter((x) => x.gender === 'male').length,
          female: ind.filter((x) => x.gender === 'female').length,
          individualTotal: ind.length,
          groupSessions: grp.length,
          groupParticipants: grp.reduce((s, x) => s + (x.participants ?? 0), 0),
          awareness: sub.filter((x) => x.kind === 'awareness').length,
        }
      }),
    }
  })

  /** REP-003 management summary by district, gender and age group. */
  r.on('get', '/reports/management', ({ ctx, query }) => {
    requirePermission(ctx, 'reports', 'view')
    const filters = readFilters(query)
    const ind = filteredStats(filters).filter((x) => x.kind === 'individual')
    const districts = [...new Set(ind.map((x) => x.districtId))].sort()
    const ages: AgeGroup[] = ['under18', '18-25', '26-35', '36-50', '51-65', 'over65']
    return {
      rows: districts.map((d) => {
        const sub = ind.filter((x) => x.districtId === d)
        return {
          district: d,
          total: sub.length,
          female: sub.filter((x) => x.gender === 'female').length,
          male: sub.filter((x) => x.gender === 'male').length,
          ...Object.fromEntries(ages.map((a) => [a, sub.filter((x) => x.ageGroup === a).length])),
        }
      }),
    }
  })

  /** REP-002 operational report from live platform data. */
  r.on('get', '/reports/operational', ({ ctx, query }) => {
    requirePermission(ctx, 'reports', 'view')
    const from = query.from ? `${query.from}-01` : '0000'
    const to = query.to ? `${query.to}-31T23:59` : '9999'
    const inRange = (iso: string) => iso >= from && iso <= to
    const apts = db.get('appointments').filter((a) => inRange(a.start))
    const statuses = ['requested', 'confirmed', 'completed', 'cancelled', 'lateCancelled', 'noShow', 'rejected'] as const
    return {
      rows: [
        { metric: 'registrations', value: db.get('beneficiaries').filter((b) => inRange(b.createdAt) && !b.pendingRegistration).length },
        { metric: 'activeUsers', value: new Set(db.get('devices').filter((d) => inRange(d.lastSeenAt)).map((d) => d.userId)).size },
        { metric: 'appointmentsTotal', value: apts.length },
        ...statuses.map((s) => ({ metric: `appointments.${s}`, value: apts.filter((a) => a.status === s).length })),
        { metric: 'groupSessions', value: db.get('groups').filter((g) => inRange(g.start)).length },
        { metric: 'resourcesPublished', value: db.get('resources').filter((x) => x.state === 'published').length },
        { metric: 'callbackRequests', value: db.get('waitlist').filter((w) => inRange(w.createdAt)).length },
      ],
    }
  })

  /** REP-004 group session report. */
  r.on('get', '/reports/groups', ({ ctx, query }) => {
    requirePermission(ctx, 'reports', 'view')
    const counsellors = new Map(db.get('counsellors').map((c) => [c.id, c.fullName]))
    const groups = db.get('groups').filter((g) => (!query.from || g.start >= query.from) && (!query.to || g.start.slice(0, 7) <= query.to))
    return {
      rows: groups
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((g) => {
          const attended = Object.values(g.attendance).filter(Boolean).length
          return {
            date: g.start.slice(0, 10),
            title: g.title,
            counsellor: counsellors.get(g.counsellorId) ?? '—',
            category: g.category,
            capacity: g.capacity,
            enrolled: g.enrolledBeneficiaryIds.length,
            attended,
            attendanceRate: g.enrolledBeneficiaryIds.length && Object.keys(g.attendance).length ? Math.round((attended / g.enrolledBeneficiaryIds.length) * 100) : null,
          }
        }),
      deck: { sessions: filteredStats({ districtId: 'kalutara' }).filter((x) => x.kind === 'group' && x.source === 'deck').length },
    }
  })

  /** REP-005 emergency alert report. Identity only for roles with full alert + profile access. */
  r.on('get', '/reports/emergency', ({ ctx, query }) => {
    requirePermission(ctx, 'reports', 'view')
    const showIdentity = identityAllowed(ctx)
    const beneficiaries = new Map(db.get('beneficiaries').map((b) => [b.id, b]))
    const alerts = db.get('alerts').filter((a) => (!query.from || a.raisedAt.slice(0, 7) >= query.from) && (!query.to || a.raisedAt.slice(0, 7) <= query.to))
    const ackTimes = alerts.map(secondsToAcknowledge).filter((x): x is number => x !== null)
    return {
      identityVisible: showIdentity,
      summary: {
        total: alerts.length,
        open: alerts.filter((a) => a.status !== 'closed').length,
        escalated: alerts.filter((a) => a.escalations.length > 0).length,
        avgAckMinutes: ackTimes.length ? Math.round((ackTimes.reduce((s, x) => s + x, 0) / ackTimes.length / 60) * 10) / 10 : null,
        outcomes: alerts.reduce<Record<string, number>>((acc, a) => {
          const key = a.outcome?.outcome ?? 'pending'
          acc[key] = (acc[key] ?? 0) + 1
          return acc
        }, {}),
      },
      rows: alerts
        .sort((a, b) => b.raisedAt.localeCompare(a.raisedAt))
        .map((a) => {
          const ack = secondsToAcknowledge(a)
          const b = a.beneficiaryId ? beneficiaries.get(a.beneficiaryId) : undefined
          return {
            raisedAt: a.raisedAt,
            source: a.source,
            client: showIdentity ? (b ? `${b.clientCode} ${b.fullName}` : a.contactPhone ? 'Anonymous (phone given)' : 'Anonymous') : b ? '••••' : 'Anonymous',
            minutesToAcknowledge: ack === null ? null : Math.round((ack / 60) * 10) / 10,
            escalations: a.escalations.length,
            status: a.status,
            outcome: a.outcome?.outcome ?? '',
          }
        }),
    }
  })
}
