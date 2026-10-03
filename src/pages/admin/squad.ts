import type { SquadMember, SquadPlayerInput } from '../../lib/types'

export const MAX_XI = 11
export const MIN_XI_FOR_TOSS = 2

/** One player in a team's squad, in batting order (substitutes come after the XI). */
export interface SquadRow {
  playerId: string
  name: string
  photoUrl: string | null
  isPlayingXI: boolean
  isCaptain: boolean
  isWicketKeeper: boolean
}

export const xiCount = (rows: SquadRow[]) => rows.filter((r) => r.isPlayingXI).length

export function fromSquad(members: SquadMember[]): SquadRow[] {
  const xi = members.filter((m) => m.isPlayingXI).sort((a, b) => a.battingOrder - b.battingOrder)
  const subs = members.filter((m) => !m.isPlayingXI)
  return [...xi, ...subs].map((m) => ({
    playerId: m.playerId, name: m.name, photoUrl: m.photoUrl, isPlayingXI: m.isPlayingXI,
    isCaptain: m.isCaptain, isWicketKeeper: m.isWicketKeeper,
  }))
}

/** Keeps the XI first (in order), substitutes after. */
function normalise(rows: SquadRow[]): SquadRow[] {
  return [...rows.filter((r) => r.isPlayingXI), ...rows.filter((r) => !r.isPlayingXI)]
}

export function addPlayer(rows: SquadRow[], p: { playerId: string; name: string; photoUrl: string | null }): SquadRow[] {
  if (rows.some((r) => r.playerId === p.playerId)) return rows
  const asXi = xiCount(rows) < MAX_XI
  return normalise([...rows, { ...p, isPlayingXI: asXi, isCaptain: false, isWicketKeeper: false }])
}

export function removePlayer(rows: SquadRow[], id: string): SquadRow[] {
  return rows.filter((r) => r.playerId !== id)
}

/** Moves a player in/out of the XI. The XI is capped at 11; leaving it clears captain/keeper. */
export function toggleXI(rows: SquadRow[], id: string): SquadRow[] {
  const row = rows.find((r) => r.playerId === id)
  if (!row) return rows
  if (!row.isPlayingXI && xiCount(rows) >= MAX_XI) return rows
  const next = rows.map((r) => r.playerId === id
    ? { ...r, isPlayingXI: !r.isPlayingXI, isCaptain: r.isPlayingXI ? false : r.isCaptain, isWicketKeeper: r.isPlayingXI ? false : r.isWicketKeeper }
    : r)
  return normalise(next)
}

/** Exclusive: only one captain. Only XI members can captain; clicking the captain again clears. */
export function setCaptain(rows: SquadRow[], id: string): SquadRow[] {
  const row = rows.find((r) => r.playerId === id)
  if (!row?.isPlayingXI) return rows
  return rows.map((r) => ({ ...r, isCaptain: r.playerId === id ? !r.isCaptain : false }))
}

export function setKeeper(rows: SquadRow[], id: string): SquadRow[] {
  const row = rows.find((r) => r.playerId === id)
  if (!row?.isPlayingXI) return rows
  return rows.map((r) => ({ ...r, isWicketKeeper: r.playerId === id ? !r.isWicketKeeper : false }))
}

/** Batting-order change, only among XI players. */
export function move(rows: SquadRow[], id: string, dir: -1 | 1): SquadRow[] {
  const xi = rows.filter((r) => r.isPlayingXI)
  const i = xi.findIndex((r) => r.playerId === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= xi.length) return rows
  const copy = [...xi]
  ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  return [...copy, ...rows.filter((r) => !r.isPlayingXI)]
}

export interface SquadCheck { errors: string[]; warnings: string[] }

export function validateSquad(rows: SquadRow[]): SquadCheck {
  const errors: string[] = []
  const warnings: string[] = []
  const xi = xiCount(rows)
  if (rows.length === 0) errors.push('Pick at least one player.')
  if (xi > MAX_XI) errors.push(`A playing XI has at most ${MAX_XI} players.`)
  if (rows.length > 25) errors.push('A squad has at most 25 players.')
  if (rows.filter((r) => r.isCaptain).length > 1) errors.push('Only one captain.')
  if (rows.filter((r) => r.isWicketKeeper).length > 1) errors.push('Only one wicket-keeper.')
  if (rows.length > 0 && xi < MIN_XI_FOR_TOSS) errors.push(`Select at least ${MIN_XI_FOR_TOSS} players in the playing XI before the toss.`)
  if (xi >= MIN_XI_FOR_TOSS && xi < MAX_XI) warnings.push(`Only ${xi} in the XI (a full side is ${MAX_XI}).`)
  if (xi >= MIN_XI_FOR_TOSS && !rows.some((r) => r.isCaptain)) warnings.push('No captain selected.')
  if (xi >= MIN_XI_FOR_TOSS && !rows.some((r) => r.isWicketKeeper)) warnings.push('No wicket-keeper selected.')
  return { errors, warnings }
}

export function toInput(rows: SquadRow[]): SquadPlayerInput[] {
  let order = 0
  return rows.map((r) => ({
    playerId: r.playerId, isPlayingXI: r.isPlayingXI, isCaptain: r.isCaptain, isWicketKeeper: r.isWicketKeeper,
    battingOrder: r.isPlayingXI ? ++order : 0,
  }))
}
