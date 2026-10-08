import { describe, expect, it } from 'vitest'
import { ASSESSMENTS } from '../config/assessments'
import { scoreAssessment } from './scoring'

const fill = (ids: string[], v: number) => Object.fromEntries(ids.map((id) => [id, v]))

describe('self-assessment scoring', () => {
  it('reverse-scores PSS-10 positive items', () => {
    const tool = ASSESSMENTS.stress
    // All "never" (0): 6 normal items score 0, 4 reversed items score 4 each.
    expect(scoreAssessment(tool, fill(tool.items.map((i) => i.id), 0)).score).toBe(16)
  })
  it('flags PHQ-9 item 9 above zero', () => {
    const tool = ASSESSMENTS.depression
    const answers = fill(tool.items.map((i) => i.id), 0)
    expect(scoreAssessment(tool, answers).riskFlag).toBe(false)
    expect(scoreAssessment(tool, { ...answers, phq9: 1 }).riskFlag).toBe(true)
  })
  it('bands GAD-7 and converts WHO-5 to a percentage', () => {
    const gad = ASSESSMENTS.anxiety
    expect(scoreAssessment(gad, fill(gad.items.map((i) => i.id), 2)).band.key).toBe('moderate')
    const who = ASSESSMENTS.wellbeing
    const r = scoreAssessment(who, fill(who.items.map((i) => i.id), 2))
    expect(r.score).toBe(40)
    expect(r.band.key).toBe('lowWellbeing')
  })
  it('refuses incomplete answers', () => {
    expect(() => scoreAssessment(ASSESSMENTS.anxiety, {})).toThrow()
  })
})
