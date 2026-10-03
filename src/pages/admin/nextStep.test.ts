import { describe, expect, it } from 'vitest'
import { nextStep } from './nextStep'

const now = new Date('2026-10-03T14:46:00Z')
const past = '2026-10-03T14:30:00Z'
const future = '2026-10-03T18:00:00Z'

describe('nextStep', () => {
  it('a scheduled match with no squads is told to set them up, and why it is not live', () => {
    const s = nextStep({ status: 'Scheduled', squadSize: 0, scheduledStart: past }, now)
    expect(s).toMatchObject({ kind: 'setup', label: 'Set up squads', overdue: true })
    expect(s.hint).toContain('Start time has passed')
    expect(s.hint).toContain('not live')
  })

  it('once both XIs exist the next step is the toss', () => {
    expect(nextStep({ status: 'Scheduled', squadSize: 22, scheduledStart: future }, now)).toMatchObject({ kind: 'setup', label: 'Record toss', overdue: false })
    expect(nextStep({ status: 'Scheduled', squadSize: 3, scheduledStart: future }, now).label).toBe('Set up squads')   // one team only
  })

  it('after the toss the match can be started', () => {
    expect(nextStep({ status: 'TossCompleted', squadSize: 22, scheduledStart: past }, now)).toMatchObject({ kind: 'start', label: 'Start match', overdue: true })
  })

  it('a match in play goes straight to scoring', () => {
    for (const status of ['Live', 'InningsBreak', 'RainDelay', 'Paused'] as const)
      expect(nextStep({ status, squadSize: 22, scheduledStart: past }, now)).toMatchObject({ kind: 'score', label: 'Score' })
  })

  it('finished matches have no next step', () => {
    for (const status of ['Completed', 'Abandoned', 'Cancelled'] as const)
      expect(nextStep({ status, squadSize: 22, scheduledStart: past }, now).kind).toBe('none')
  })

  it('a match without a start time is never overdue', () => {
    expect(nextStep({ status: 'Scheduled', squadSize: 0, scheduledStart: null }, now).overdue).toBe(false)
  })

  it('the exact start moment counts as due', () => {
    expect(nextStep({ status: 'Scheduled', squadSize: 0, scheduledStart: now.toISOString() }, now).overdue).toBe(true)
  })
})