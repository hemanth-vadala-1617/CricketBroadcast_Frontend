import { describe, expect, it } from 'vitest'
import type { Team, Tournament } from '../../lib/types'
import { UNASSIGNED, competitionNames, groupTeams } from './teamFolders'

const team = (id: string, name: string, tournamentIds?: string[]): Team => ({ id, name, shortName: name.slice(0, 3).toUpperCase(), logoUrl: null, primaryColor: null, secondaryColor: null, country: '', isActive: true, playerCount: 0, tournamentIds })
const cup = (id: string, name: string, season: string) => ({ id, name, season }) as Tournament

const ipl25 = cup('ipl25', 'IPL', '2025')
const ipl26 = cup('ipl26', 'IPL', '2026')
const bbl = cup('bbl', 'BBL', '2025-26')
const wc = cup('wc', 'World Cup', '2026')
const tournaments = [wc, ipl25, bbl, ipl26, cup('empty', 'Ranji', '2026')]

describe('groupTeams', () => {
  it('puts each team in a folder per competition, and a team in several in each of them', () => {
    const teams = [team('1', 'Mumbai', ['ipl26']), team('2', 'India', ['wc', 'ipl26']), team('3', 'Sydney Sixers', ['bbl'])]
    const folders = groupTeams(teams, tournaments)
    expect(folders.map((f) => `${f.name} ${f.subtitle}`)).toEqual(['BBL 2025-26', 'IPL 2026', 'World Cup 2026'])
    expect(folders.find((f) => f.id === 'ipl26')!.teams.map((t) => t.name)).toEqual(['Mumbai', 'India'])
    expect(folders.find((f) => f.id === 'wc')!.teams.map((t) => t.name)).toEqual(['India'])
  })

  it('orders seasons of the same competition newest first and leaves out empty competitions', () => {
    const folders = groupTeams([team('1', 'Mumbai', ['ipl25', 'ipl26'])], tournaments)
    expect(folders.map((f) => f.subtitle)).toEqual(['2026', '2025'])
    expect(folders.some((f) => f.id === 'empty')).toBe(false)
  })

  it('collects teams in no competition (or an unknown one, or an older API) into a last folder', () => {
    const folders = groupTeams([team('1', 'Mumbai', ['ipl26']), team('2', 'Loose'), team('3', 'Ghost', ['gone'])], tournaments)
    const last = folders.at(-1)!
    expect(last.id).toBe(UNASSIGNED)
    expect(last.teams.map((t) => t.name)).toEqual(['Loose', 'Ghost'])
  })

  it('has no folders for no teams', () => { expect(groupTeams([], tournaments)).toEqual([]) })
})

describe('competitionNames', () => {
  it('reads the competitions as "name season"', () => {
    expect(competitionNames({ tournamentIds: ['ipl26', 'wc', 'gone'] }, tournaments)).toEqual(['IPL 2026', 'World Cup 2026'])
    expect(competitionNames({}, tournaments)).toEqual([])
  })
})
