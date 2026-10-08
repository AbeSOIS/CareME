import { differenceInYears, parseISO } from 'date-fns'
import type { AgeGroup, ISODate } from '../types'

/** Whole years between a date of birth and `on` (defaults to now). */
export function ageOn(dateOfBirth: ISODate, on: Date = new Date()): number {
  return differenceInYears(on, parseISO(dateOfBirth))
}

/** FR-085: a beneficiary under the configured threshold (placeholder 18) is a minor. */
export function isMinor(dateOfBirth: ISODate | undefined, threshold: number, on: Date = new Date()): boolean {
  if (!dateOfBirth) return false
  return ageOn(dateOfBirth, on) < threshold
}

export function ageGroupOf(age: number): AgeGroup {
  if (age < 18) return 'under18'
  if (age <= 25) return '18-25'
  if (age <= 35) return '26-35'
  if (age <= 50) return '36-50'
  if (age <= 65) return '51-65'
  return 'over65'
}
