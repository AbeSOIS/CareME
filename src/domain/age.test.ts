import { describe, expect, it } from 'vitest'
import { ageGroupOf, ageOn, isMinor } from './age'

const today = new Date('2026-10-08T10:00:00')

describe('age', () => {
  it('counts whole years only', () => {
    expect(ageOn('2008-10-09', today)).toBe(17)
    expect(ageOn('2008-10-08', today)).toBe(18)
  })

  it('flags minors below the threshold', () => {
    expect(isMinor('2008-10-09', 18, today)).toBe(true)
    expect(isMinor('2008-10-08', 18, today)).toBe(false)
    expect(isMinor(undefined, 18, today)).toBe(false)
  })

  it('maps ages to report bands', () => {
    expect(ageGroupOf(17)).toBe('under18')
    expect(ageGroupOf(25)).toBe('18-25')
    expect(ageGroupOf(66)).toBe('over65')
  })
})
