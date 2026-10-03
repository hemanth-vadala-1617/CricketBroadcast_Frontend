import type { CreateMatchInput, MatchFormat, MatchRules, MatchSummary, Tournament } from '../../lib/types'
import { fromLocalInput, toLocalInput } from '../../lib/utils'

export interface MatchFormValues {
  tournamentId: string
  homeTeamId: string
  awayTeamId: string
  venueId: string
  matchRulesId: string
  overlayThemeId: string
  title: string
  scheduledStart: string // datetime-local value
}

export const emptyMatchForm: MatchFormValues = {
  tournamentId: '', homeTeamId: '', awayTeamId: '', venueId: '', matchRulesId: '', overlayThemeId: '', title: '', scheduledStart: '',
}

export function fromSummary(m: MatchSummary): MatchFormValues {
  return {
    tournamentId: m.tournamentId, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, venueId: m.venueId,
    matchRulesId: m.matchRulesId, overlayThemeId: m.overlayThemeId ?? '', title: m.title, scheduledStart: toLocalInput(m.scheduledStart),
  }
}

/** Picking a tournament pre-fills rules and theme from its defaults (rules must still exist). */
export function applyTournament(form: MatchFormValues, tournament: Tournament | undefined, rules: MatchRules[]): MatchFormValues {
  if (!tournament) return { ...form, tournamentId: '' }
  const rulesOk = tournament.defaultMatchRulesId && rules.some((r) => r.id === tournament.defaultMatchRulesId)
  return {
    ...form,
    tournamentId: tournament.id,
    matchRulesId: rulesOk ? tournament.defaultMatchRulesId! : form.matchRulesId,
    overlayThemeId: tournament.overlayThemeId ?? form.overlayThemeId,
  }
}

/** Test rules always mean a TEST match; otherwise the tournament's format applies. */
export function matchFormatFor(rules: MatchRules | undefined, tournament: Tournament | undefined): MatchFormat {
  if (rules?.isTest) return 'TEST'
  return tournament?.format ?? 'T20'
}

export function validateMatchForm(f: MatchFormValues): string | null {
  if (!f.tournamentId) return 'Choose a tournament.'
  if (!f.homeTeamId || !f.awayTeamId) return 'Choose both teams.'
  if (f.homeTeamId === f.awayTeamId) return 'Home and away teams must be different.'
  if (!f.venueId) return 'Choose a venue.'
  if (!f.matchRulesId) return 'Choose the match rules.'
  return null
}

export function toCreateInput(f: MatchFormValues, rules: MatchRules | undefined, tournament: Tournament | undefined): CreateMatchInput {
  return {
    tournamentId: f.tournamentId, homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId, venueId: f.venueId, matchRulesId: f.matchRulesId,
    overlayThemeId: f.overlayThemeId || null, title: f.title.trim() || null,
    matchFormat: matchFormatFor(rules, tournament), scheduledStart: fromLocalInput(f.scheduledStart),
  }
}
