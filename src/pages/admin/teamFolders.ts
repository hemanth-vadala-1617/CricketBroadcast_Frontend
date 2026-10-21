import type { Team, Tournament } from '../../lib/types'

export const UNASSIGNED = 'unassigned'

/** "IPL 2026" from the name and season; the season is left off when the name already says it ("World Cup Qualifier, 2026"). */
export function competitionLabel(t: Pick<Tournament, 'name' | 'season'>): string {
  return !t.season || t.name.includes(t.season) ? t.name : `${t.name} ${t.season}`
}

export interface TeamFolder { id: string; name: string; subtitle: string; teams: Team[] }

/**
 * Groups teams into folders, one per competition (IPL, BBL, World Cup...). A team that belongs to several competitions
 * appears in each of them; a team in none goes to a last folder. Empty competitions get no folder, folders are in name order
 * (newest season first within the same name) and teams keep the order they came in.
 */
export function groupTeams(teams: Team[], tournaments: Tournament[]): TeamFolder[] {
  const known = new Map(tournaments.map((t) => [t.id, t]))
  const folders = new Map<string, TeamFolder>()
  const loose: Team[] = []
  for (const team of teams) {
    const ids = (team.tournamentIds ?? []).filter((id) => known.has(id))
    if (ids.length === 0) { loose.push(team); continue }
    for (const id of ids) {
      const t = known.get(id)!
      if (!folders.has(id)) folders.set(id, { id, name: t.name, subtitle: t.name.includes(t.season) ? '' : t.season, teams: [] })
      folders.get(id)!.teams.push(team)
    }
  }
  const ordered = [...folders.values()].sort((a, b) => a.name.localeCompare(b.name) || b.subtitle.localeCompare(a.subtitle))
  if (loose.length > 0) ordered.push({ id: UNASSIGNED, name: 'Not in any competition', subtitle: '', teams: loose })
  return ordered
}

/** The competitions a team belongs to, as readable names ("IPL 2026"). */
export function competitionNames(team: Pick<Team, 'tournamentIds'>, tournaments: Tournament[]): string[] {
  const known = new Map(tournaments.map((t) => [t.id, t]))
  return (team.tournamentIds ?? []).flatMap((id) => { const t = known.get(id); return t ? [competitionLabel(t)] : [] })
}
