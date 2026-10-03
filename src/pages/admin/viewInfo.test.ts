import { describe, expect, it } from 'vitest'
import { daySpan, formatDay, fullName, roleName, rulesSummary, summariseMatches } from './viewInfo'
import type { MatchRules } from '../../lib/types'

const t20: MatchRules = {
  id: 'r1', name: 'T20', isTest: false, ballsPerOver: 6, oversPerInnings: 20, maxOversPerBowler: 4, powerplayOvers: 6, wideRuns: 1, noBallRuns: 1,
  freeHitEnabled: true, followOnEnabled: false, inningsPerSide: 1, days: 1, oversPerDay: 0, sessionsPerDay: 1, newBallAfterOvers: 0, followOnMargin: 200,
}
const test: MatchRules = {
  ...t20, id: 'r2', name: 'Test', isTest: true, oversPerInnings: 0, maxOversPerBowler: 0, powerplayOvers: 0, freeHitEnabled: false, followOnEnabled: true,
  inningsPerSide: 2, days: 5, oversPerDay: 90, sessionsPerDay: 3, newBallAfterOvers: 80,
}

describe('formatDay', () => {
  it('formats the date part only', () => {
    expect(formatDay('2026-10-03T00:00:00+00:00')).toBe('3 Oct 2026')
    expect(formatDay('2026-12-25T23:59:59Z')).toBe('25 Dec 2026')
  })
  it('shows a dash for nothing', () => {
    expect(formatDay(null)).toBe('—')
    expect(formatDay('')).toBe('—')
    expect(formatDay('soon')).toBe('—')
  })
})

describe('daySpan', () => {
  it('counts both end days', () => {
    expect(daySpan('2026-10-03', '2026-10-03')).toBe(1)
    expect(daySpan('2026-10-03', '2026-10-04')).toBe(2)
    expect(daySpan('2026-10-02T00:00:00Z', '2026-11-01T00:00:00Z')).toBe(31)
  })
  it('crosses a leap day and a year end', () => {
    expect(daySpan('2028-02-28', '2028-03-01')).toBe(3)
    expect(daySpan('2026-12-30', '2027-01-02')).toBe(4)
  })
  it('is 0 for an end before the start or junk', () => {
    expect(daySpan('2026-10-04', '2026-10-03')).toBe(0)
    expect(daySpan('x', 'y')).toBe(0)
  })
})

describe('rulesSummary', () => {
  it('describes a limited-overs rule set', () => {
    expect(rulesSummary(t20)).toBe('20 overs a side · max 4 per bowler · powerplay 6 overs · free hit')
  })
  it('handles unlimited bowlers and no powerplay', () => {
    expect(rulesSummary({ ...t20, maxOversPerBowler: 0, powerplayOvers: 0, freeHitEnabled: false })).toBe('20 overs a side · no bowler limit')
    expect(rulesSummary({ ...t20, powerplayOvers: 1 })).toContain('powerplay 1 over ·')
  })
  it('describes a Test rule set by days, overs a day and sessions', () => {
    expect(rulesSummary(test)).toBe('5 days · 90 overs a day · 3 sessions a day · follow-on at 200')
    expect(rulesSummary({ ...test, days: 1, sessionsPerDay: 1, followOnEnabled: false })).toBe('1 day · 90 overs a day · 1 session a day')
  })
})

describe('summariseMatches', () => {
  const m = (status: string, home: string, away: string) => ({ status, homeTeamName: home, awayTeamName: away }) as never
  it('counts live, completed and upcoming and lists each team once', () => {
    const s = summariseMatches([m('Live', 'India', 'Australia'), m('Completed', 'India', 'England'), m('Scheduled', 'Australia', 'England'), m('InningsBreak', 'India', 'Pakistan'), m('Abandoned', 'Pakistan', 'England')])
    expect(s).toEqual({ total: 5, live: 2, completed: 2, upcoming: 1, teams: ['Australia', 'England', 'India', 'Pakistan'] })
  })
  it('is all zeros for no matches', () => {
    expect(summariseMatches([])).toEqual({ total: 0, live: 0, completed: 0, upcoming: 0, teams: [] })
  })
  it('counts a toss-completed match as upcoming', () => {
    expect(summariseMatches([m('TossCompleted', 'A', 'B')]).upcoming).toBe(1)
  })
})

describe('player helpers', () => {
  it('builds the full name, falling back to the display name', () => {
    expect(fullName({ firstName: 'Virat', lastName: 'Kohli', displayName: 'V Kohli' })).toBe('Virat Kohli')
    expect(fullName({ firstName: 'Pat', lastName: '', displayName: 'Pat Cummins' })).toBe('Pat')
    expect(fullName({ firstName: '', lastName: '', displayName: 'Pat Cummins' })).toBe('Pat Cummins')
  })
  it('names the roles for people', () => {
    expect(roleName('AllRounder')).toBe('All-rounder')
    expect(roleName('WicketKeeper')).toBe('Wicket-keeper')
  })
})
