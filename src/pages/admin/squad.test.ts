import { describe, expect, it } from 'vitest'
import { addPlayer, fromSquad, move, removePlayer, setCaptain, setKeeper, toInput, toggleXI, validateSquad, xiCount, type SquadRow } from './squad'

const p = (n: number) => ({ playerId: `p${n}`, name: `Player ${n}`, photoUrl: null })
const build = (count: number): SquadRow[] => Array.from({ length: count }, (_, i) => i + 1).reduce<SquadRow[]>((rows, n) => addPlayer(rows, p(n)), [])

describe('squad helpers', () => {
  it('adds the first 11 players to the XI and the rest as substitutes', () => {
    const rows = build(13)
    expect(xiCount(rows)).toBe(11)
    expect(rows.slice(11).every((r) => !r.isPlayingXI)).toBe(true)
  })

  it('does not add the same player twice', () => {
    expect(addPlayer(build(2), p(1))).toHaveLength(2)
  })

  it('refuses a 12th player in the XI', () => {
    const rows = build(12)
    expect(toggleXI(rows, 'p12')).toEqual(rows)
  })

  it('moving someone out of the XI clears captain/keeper and puts them after the XI', () => {
    let rows = build(3)
    rows = setCaptain(setKeeper(rows, 'p1'), 'p1')
    rows = toggleXI(rows, 'p1')
    const r = rows.find((x) => x.playerId === 'p1')!
    expect(r.isPlayingXI).toBe(false)
    expect(r.isCaptain || r.isWicketKeeper).toBe(false)
    expect(rows[rows.length - 1]!.playerId).toBe('p1')
  })

  it('captain and keeper are exclusive and XI-only', () => {
    let rows = build(12)
    rows = setCaptain(rows, 'p1'); rows = setCaptain(rows, 'p2')
    expect(rows.filter((r) => r.isCaptain).map((r) => r.playerId)).toEqual(['p2'])
    expect(setCaptain(rows, 'p12').find((r) => r.playerId === 'p12')!.isCaptain).toBe(false)
    rows = setKeeper(rows, 'p3'); rows = setKeeper(rows, 'p4')
    expect(rows.filter((r) => r.isWicketKeeper).map((r) => r.playerId)).toEqual(['p4'])
  })

  it('moves batting order only inside the XI and stops at the ends', () => {
    const rows = build(12)
    expect(move(rows, 'p2', -1).map((r) => r.playerId).slice(0, 2)).toEqual(['p2', 'p1'])
    expect(move(rows, 'p1', -1)).toEqual(rows)
    expect(move(rows, 'p11', 1)).toEqual(rows) // p12 is a substitute
  })

  it('numbers batting order 1..n for the XI and 0 for substitutes', () => {
    const input = toInput(build(12))
    expect(input.slice(0, 11).map((i) => i.battingOrder)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(input[11]!.battingOrder).toBe(0)
  })

  it('validates XI size, captain and keeper', () => {
    expect(validateSquad([]).errors).toContain('Pick at least one player.')
    expect(validateSquad(build(1)).errors.join(' ')).toMatch(/at least 2/)
    const full = setKeeper(setCaptain(build(11), 'p1'), 'p5')
    expect(validateSquad(full)).toEqual({ errors: [], warnings: [] })
    expect(validateSquad(build(11)).warnings).toEqual(['No captain selected.', 'No wicket-keeper selected.'])
  })

  it('round-trips a server squad and removes players', () => {
    const rows = fromSquad([
      { playerId: 'b', name: 'B', photoUrl: null, isPlayingXI: true, isCaptain: false, isWicketKeeper: true, battingOrder: 2 },
      { playerId: 's', name: 'S', photoUrl: null, isPlayingXI: false, isCaptain: false, isWicketKeeper: false, battingOrder: 0 },
      { playerId: 'a', name: 'A', photoUrl: null, isPlayingXI: true, isCaptain: true, isWicketKeeper: false, battingOrder: 1 },
    ])
    expect(rows.map((r) => r.playerId)).toEqual(['a', 'b', 's'])
    expect(removePlayer(rows, 'a').map((r) => r.playerId)).toEqual(['b', 's'])
  })
})
