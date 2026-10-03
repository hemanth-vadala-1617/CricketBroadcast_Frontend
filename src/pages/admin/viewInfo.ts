import type { MatchRules, MatchSummary, Player, PlayerRole } from '../../lib/types'

const DAY_MS = 86_400_000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2026-10-03T00:00:00+00:00" -> "3 Oct 2026". Works on the date part only, so the time zone can never shift the day.
export function formatDay(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!m) return '—'
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? '?'} ${m[1]}`
}

// Number of calendar days a tournament runs, both end days included (3 Oct to 3 Oct is 1 day).
export function daySpan(startIso: string, endIso: string): number {
  const s = Date.UTC(Number(startIso.slice(0, 4)), Number(startIso.slice(5, 7)) - 1, Number(startIso.slice(8, 10)))
  const e = Date.UTC(Number(endIso.slice(0, 4)), Number(endIso.slice(5, 7)) - 1, Number(endIso.slice(8, 10)))
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0
  return Math.round((e - s) / DAY_MS) + 1
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

// One line describing a rule set, e.g. "20 overs a side · max 4 per bowler · powerplay 6 overs".
export function rulesSummary(r: MatchRules): string {
  if (r.isTest) {
    const parts = [plural(r.days, 'day'), `${r.oversPerDay} overs a day`, plural(r.sessionsPerDay, 'session') + ' a day']
    if (r.followOnEnabled) parts.push(`follow-on at ${r.followOnMargin}`)
    return parts.join(' · ')
  }
  const parts = [`${r.oversPerInnings} overs a side`]
  parts.push(r.maxOversPerBowler > 0 ? `max ${r.maxOversPerBowler} per bowler` : 'no bowler limit')
  if (r.powerplayOvers > 0) parts.push(`powerplay ${plural(r.powerplayOvers, 'over')}`)
  if (r.freeHitEnabled) parts.push('free hit')
  return parts.join(' · ')
}

const LIVE = new Set(['Live', 'InningsBreak', 'RainDelay', 'Paused'])
const DONE = new Set(['Completed', 'Abandoned', 'Cancelled'])

export interface MatchTotals { total: number; live: number; completed: number; upcoming: number; teams: string[] }

// Counts for the tournament view and the distinct team names that appear in its matches.
export function summariseMatches(matches: Pick<MatchSummary, 'status' | 'homeTeamName' | 'awayTeamName'>[]): MatchTotals {
  const teams = new Set<string>()
  let live = 0
  let completed = 0
  for (const m of matches) {
    teams.add(m.homeTeamName)
    teams.add(m.awayTeamName)
    if (LIVE.has(m.status)) live++
    else if (DONE.has(m.status)) completed++
  }
  return { total: matches.length, live, completed, upcoming: matches.length - live - completed, teams: [...teams].sort((a, b) => a.localeCompare(b)) }
}

const ROLE_LABEL: Record<PlayerRole, string> = { Batter: 'Batter', Bowler: 'Bowler', AllRounder: 'All-rounder', WicketKeeper: 'Wicket-keeper' }
export const roleName = (r: PlayerRole): string => ROLE_LABEL[r] ?? r

// "Virat Kohli" from the first and last name; the display name when neither is stored.
export function fullName(p: Pick<Player, 'firstName' | 'lastName' | 'displayName'>): string {
  const joined = `${p.firstName} ${p.lastName}`.trim()
  return joined || p.displayName
}
