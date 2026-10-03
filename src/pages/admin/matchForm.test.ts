import { describe, expect, it } from 'vitest'
import { applyTournament, emptyMatchForm, matchFormatFor, toCreateInput, validateMatchForm } from './matchForm'
import type { MatchRules, Tournament } from '../../lib/types'

const rules = (id: string, isTest: boolean) => ({ id, name: id, isTest }) as MatchRules
const tournament = (over: Partial<Tournament>) => ({ id: 't1', format: 'ODI', defaultMatchRulesId: null, overlayThemeId: null, ...over }) as Tournament

describe('match form helpers', () => {
  it('pre-fills rules and theme from the tournament defaults', () => {
    const f = applyTournament(emptyMatchForm, tournament({ defaultMatchRulesId: 'r1', overlayThemeId: 'th1' }), [rules('r1', false)])
    expect(f).toMatchObject({ tournamentId: 't1', matchRulesId: 'r1', overlayThemeId: 'th1' })
  })

  it('keeps the current rules when the tournament default no longer exists', () => {
    const f = applyTournament({ ...emptyMatchForm, matchRulesId: 'mine' }, tournament({ defaultMatchRulesId: 'gone' }), [rules('mine', false)])
    expect(f.matchRulesId).toBe('mine')
  })

  it('Test rules force TEST, otherwise the tournament format applies', () => {
    expect(matchFormatFor(rules('r', true), tournament({ format: 'T20' }))).toBe('TEST')
    expect(matchFormatFor(rules('r', false), tournament({ format: 'ODI' }))).toBe('ODI')
    expect(matchFormatFor(undefined, undefined)).toBe('T20')
  })

  it('rejects incomplete forms and identical teams', () => {
    expect(validateMatchForm(emptyMatchForm)).toMatch(/tournament/i)
    const base = { ...emptyMatchForm, tournamentId: 't', homeTeamId: 'a', awayTeamId: 'a', venueId: 'v', matchRulesId: 'r' }
    expect(validateMatchForm(base)).toMatch(/different/)
    expect(validateMatchForm({ ...base, awayTeamId: 'b' })).toBeNull()
  })

  it('builds the request with null for blank optional fields', () => {
    const f = { ...emptyMatchForm, tournamentId: 't1', homeTeamId: 'a', awayTeamId: 'b', venueId: 'v', matchRulesId: 'r', title: '  ' }
    expect(toCreateInput(f, rules('r', false), tournament({ format: 'T20' }))).toMatchObject({ overlayThemeId: null, title: null, scheduledStart: null, matchFormat: 'T20' })
  })
})
