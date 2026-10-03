import type { Lineup, LineupPlayer, MatchState } from '../../lib/types'

/** Rows of at most 4 (a 4 / 4 / 3 grid for an XI), balanced so no row is left with one lonely card. */
export function rowSizes(count: number, perRow = 4): number[] {
  if (count <= 0) return []
  const rows = Math.ceil(count / perRow)
  const base = Math.floor(count / rows)
  const extra = count % rows
  return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0))
}

/** "(C)", "(WK)" or "(C & WK)" appended to the surname, as on the TV graphic. */
export function roleSuffix(p: Pick<LineupPlayer, 'isCaptain' | 'isWicketKeeper'>): string {
  if (p.isCaptain && p.isWicketKeeper) return '(C & WK)'
  if (p.isCaptain) return '(C)'
  if (p.isWicketKeeper) return '(WK)'
  return ''
}

/** Small first name over a big SURNAME; a one-word name goes in the big line. */
export function cardName(p: LineupPlayer): { first: string; last: string } {
  const first = p.firstName.trim()
  const last = p.lastName.trim()
  if (first || last) return { first: last ? first : '', last: (last || first) + roleSuffix(p) }
  const parts = p.displayName.trim().split(/\s+/)
  return { first: parts.length > 1 ? parts.slice(0, -1).join(' ') : '', last: (parts.at(-1) ?? '') + roleSuffix(p) }
}

// payload.teamId value that puts both playing XIs on screen side by side.
export const BOTH = 'both'

/** The lineups on air: [one team], [home, away] for "both", or [] when nothing is on air. */
export function selectedLineups(state: MatchState): Lineup[] {
  const g = state.graphics.TeamLineup
  const id = g?.isVisible ? (g.payload?.teamId as string | undefined) : undefined
  if (!id || !state.lineups) return []
  const teams = [state.lineups.home, state.lineups.away].filter((l) => l.players.length > 0)
  if (id === BOTH) return teams
  return teams.filter((l) => l.team.id === id)
}

/** The single team on air (null when nothing, or both teams, are on air). */
export function selectedLineup(state: MatchState): Lineup | null {
  const l = selectedLineups(state)
  return l.length === 1 ? l[0]! : null
}

const GAP = 22
const AREA_H = 900

/** Card width so that every row fits the 1080 px canvas under the header (fewer rows = bigger cards). */
export function cardWidth(rows: number): number {
  if (rows <= 0) return 0
  const fit = Math.floor((AREA_H - (rows - 1) * GAP) / rows / 1.46)
  return Math.min(rows === 1 ? 320 : 300, fit)
}
export const CARD_GAP = GAP

// Both teams at once: two grids of 4 columns side by side, so the cards are smaller than for one team.
export const BOTH_GAP = 14
const BOTH_AREA_H = 864          // 1080 minus the header and the team labels
const BOTH_SIDE_W = 880          // (1920 - 2 * 60 margin - 40 between) / 2
export function cardWidthBoth(rows: number): number {
  if (rows <= 0) return 0
  const byHeight = Math.floor((BOTH_AREA_H - (rows - 1) * BOTH_GAP) / rows / 1.46)
  const byWidth = Math.floor((BOTH_SIDE_W - 3 * BOTH_GAP) / 4)
  return Math.min(byHeight, byWidth, 230)
}

/** Largest font (<= max) that keeps `text` inside `width` px (display font is about 0.52em per capital). */
export function fitFont(text: string, width: number, max: number): number {
  if (!text) return max
  return Math.max(10, Math.min(max, Math.floor(width / (text.length * 0.52))))
}