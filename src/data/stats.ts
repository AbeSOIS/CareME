import { ageGroupOf } from '../domain/age'
import { createRng } from '../domain/rng'
import type { AgeGroup, AwarenessCategory, Gender, ID, SessionCategory } from '../types'
import kalutara from './kalutara-2026.json'

/**
 * Unit-level statistic records for dashboards and reports.
 *
 * Kalutara Jan–Jun 2026 rows are expanded from the progress deck so that every
 * per-DS, per-category and per-gender total matches the deck exactly. The deck has
 * no monthly split or age groups, so months and age groups are FABRICATED
 * (deterministic). Other districts' figures are entirely fabricated for the demo.
 */
export interface StatRecord {
  month: string
  districtId: ID
  dsDivisionId?: ID
  kind: 'individual' | 'group' | 'awareness'
  category: SessionCategory | AwarenessCategory
  gender?: Extract<Gender, 'male' | 'female'>
  ageGroup?: AgeGroup
  /** Group sessions: participants in this session. */
  participants?: number
  source: 'deck' | 'fabricated' | 'platform'
}

const MONTHS = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']
const MONTH_WEIGHTS = [0.14, 0.15, 0.17, 0.16, 0.18, 0.2]
const AGE_WEIGHTS: Array<[AgeGroup, number]> = [
  ['under18', 0.12],
  ['18-25', 0.2],
  ['26-35', 0.24],
  ['36-50', 0.26],
  ['51-65', 0.13],
  ['over65', 0.05],
]

function weighted<T>(rng: ReturnType<typeof createRng>, items: Array<[T, number]>): T {
  let x = rng.next()
  for (const [item, w] of items) {
    if ((x -= w) <= 0) return item
  }
  return items[items.length - 1][0]
}

const SESSION_CATS: SessionCategory[] = ['mentalDisorder', 'family', 'relationship', 'education', 'economic', 'drugRelated']

let cached: StatRecord[] | null = null

export function baselineStats(): StatRecord[] {
  if (cached) return cached
  const rng = createRng(401)
  const out: StatRecord[] = []
  const monthPick = () => weighted(rng, MONTHS.map((m, i) => [m, MONTH_WEIGHTS[i]] as [string, number]))

  // Individual: shuffle a gender list per DS so category totals and gender totals both match.
  for (const [ds, row] of Object.entries(kalutara.individual)) {
    const genders: Array<'male' | 'female'> = [...Array(row.male).fill('male'), ...Array(row.female).fill('female')]
    for (let i = genders.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1))
      ;[genders[i], genders[j]] = [genders[j], genders[i]]
    }
    let g = 0
    for (const cat of SESSION_CATS) {
      for (let n = 0; n < row[cat]; n++) {
        out.push({ month: monthPick(), districtId: 'kalutara', dsDivisionId: ds, kind: 'individual', category: cat, gender: genders[g++], ageGroup: weighted(rng, AGE_WEIGHTS), source: 'deck' })
      }
    }
  }

  // Group: spread each DS's participants across its sessions.
  for (const [ds, row] of Object.entries(kalutara.group)) {
    const sessions = Object.entries(row.sessions as Record<string, number>).flatMap(([cat, n]) => Array<SessionCategory>(n).fill(cat as SessionCategory))
    const total = row.male + row.female
    sessions.forEach((cat, i) => {
      const share = Math.floor(total / sessions.length) + (i < total % sessions.length ? 1 : 0)
      out.push({ month: monthPick(), districtId: 'kalutara', dsDivisionId: ds, kind: 'group', category: cat, participants: share, source: 'deck' })
    })
  }

  for (const [ds, row] of Object.entries(kalutara.awareness)) {
    for (const [cat, n] of Object.entries(row as Record<string, number>)) {
      for (let k = 0; k < n; k++) out.push({ month: monthPick(), districtId: 'kalutara', dsDivisionId: ds, kind: 'awareness', category: cat as AwarenessCategory, source: 'deck' })
    }
  }

  // Fabricated comparison figures for a few other districts.
  const others: Array<[ID, number]> = [
    ['colombo', 520],
    ['gampaha', 430],
    ['galle', 260],
    ['kandy', 310],
    ['jaffna', 240],
    ['batticaloa', 180],
  ]
  for (const [districtId, n] of others) {
    for (let k = 0; k < n; k++) {
      out.push({
        month: monthPick(),
        districtId,
        kind: 'individual',
        category: rng.pick(SESSION_CATS),
        gender: rng.chance(0.62) ? 'female' : 'male',
        ageGroup: weighted(rng, AGE_WEIGHTS),
        source: 'fabricated',
      })
    }
    for (let k = 0; k < Math.round(n / 14); k++) {
      out.push({ month: monthPick(), districtId, kind: 'group', category: rng.pick(SESSION_CATS), participants: rng.int(6, 20), source: 'fabricated' })
    }
    for (let k = 0; k < Math.round(n / 3); k++) {
      out.push({ month: monthPick(), districtId, kind: 'awareness', category: rng.pick(['mentalDisorder', 'family', 'psychoSocial', 'educational', 'elder'] as AwarenessCategory[]), source: 'fabricated' })
    }
  }
  cached = out
  return out
}

export { ageGroupOf }
