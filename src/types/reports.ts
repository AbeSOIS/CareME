import type { Gender, ID } from './common'
import type { SessionCategory } from './appointments'

/** Monthly per-DS-division statistic row (seeded from the Kalutara 2026 progress deck). */
export interface ProgressStat {
  month: string // "2026-01"
  districtId: ID
  dsDivisionId: ID
  kind: 'individual' | 'group' | 'awareness'
  category: SessionCategory | AwarenessCategory
  gender?: Exclude<Gender, 'other' | 'undisclosed'>
  ageGroup?: string
  /** Sessions (individual), sessions (group) or programmes (awareness). */
  count: number
  /** Group sessions only: participants. */
  participants?: number
}

export type AwarenessCategory =
  | 'mentalDisorder'
  | 'family'
  | 'psychoSocial'
  | 'educational'
  | 'aswasuma'
  | 'vocational'
  | 'elder'
  | 'mindfulness'
  | 'disabled'

export interface ReportColumn<T> {
  key: keyof T & string
  label: string
}
