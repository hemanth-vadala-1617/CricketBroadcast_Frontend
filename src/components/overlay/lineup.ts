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

/** Which team the producer put on air (graphics.TeamLineup.payload.teamId), or null. */
export function selectedLineup(state: MatchState): Lineup | null {
  const g = state.graphics.TeamLineup
  const id = g?.isVisible ? (g.payload?.teamId as string | undefined) : undefined
  if (!id || !state.lineups) return null
  const found = [state.lineups.home, state.lineups.away].find((l) => l.team.id === id)
  return found && found.players.length > 0 ? found : null
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

/** Largest font (<= max) that keeps `text` inside `width` px (display font is about 0.52em per capital). */
export function fitFont(text: string, width: number, max: number): number {
  if (!text) return max
  return Math.max(10, Math.min(max, Math.floor(width / (text.length * 0.52))))
}