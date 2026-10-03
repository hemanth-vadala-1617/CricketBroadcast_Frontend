import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LineupToggle } from './LineupAirToggle'
import { lineupCall, lineupOnAir } from './lineupAir'
import { lineupOf, lineupState, withGraphics } from '../overlay/fixtures'
import type { MatchState } from '../../lib/types'

const put = vi.fn()
vi.mock('../../lib/api', async (orig) => ({ ...(await orig<typeof import('../../lib/api')>()), api: { put: (...a: unknown[]) => put(...a) } }))

// lineupState(): India's XI (11) is on air; Australia has one player
const onAirIndia = () => lineupState()
const offAir = () => withGraphics(lineupState(), { TeamLineup: false })
const awayId = (s: MatchState) => s.lineups.away.team.id

describe('lineup helpers', () => {
  it('knows which team is on air', () => {
    expect(lineupOnAir(onAirIndia())).toBe('ind')
    expect(lineupOnAir(offAir())).toBeNull()
  })
  it('one tap toggles: show when off, hide when on, switch when the other team is on', () => {
    expect(lineupCall(offAir(), 'ind')).toEqual({ isVisible: true, payload: { teamId: 'ind' } })
    expect(lineupCall(onAirIndia(), 'ind')).toEqual({ isVisible: false })
    expect(lineupCall(onAirIndia(), 'aus')).toEqual({ isVisible: true, payload: { teamId: 'aus' } })
  })
})

describe('LineupToggle', () => {
  beforeEach(() => { put.mockReset(); put.mockResolvedValue(offAir()) })

  it('shows one toggle per team with its player count and what is on air', () => {
    render(<LineupToggle state={onAirIndia()} onState={() => undefined} />)
    const india = screen.getByRole('button', { name: /India/ })
    const aus = screen.getByRole('button', { name: new RegExp(onAirIndia().awayTeam.name) })
    expect(india).toHaveAttribute('aria-pressed', 'true')
    expect(india).toHaveTextContent('11 players')
    expect(india).toHaveTextContent('ON AIR')
    expect(aus).toHaveAttribute('aria-pressed', 'false')
    expect(aus).toHaveTextContent('Off')
  })

  it('both toggles read Off when nothing is on air', () => {
    render(<LineupToggle state={offAir()} onState={() => undefined} />)
    for (const b of screen.getAllByRole('button')) expect(b).toHaveAttribute('aria-pressed', 'false')
  })

  it('tapping an off team puts its XI on air (and hands the new state back)', async () => {
    const next = onAirIndia()
    put.mockResolvedValue(next)
    const onState = vi.fn()
    const s = offAir()
    render(<LineupToggle state={s} onState={onState} />)
    await userEvent.click(screen.getByRole('button', { name: /India/ }))
    expect(put).toHaveBeenCalledWith(`/api/graphics/match/${s.matchId}/TeamLineup`, { isVisible: true, payload: { teamId: 'ind' } })
    await waitFor(() => expect(onState).toHaveBeenCalledWith(next))
  })

  it('tapping the team that is on air hides it', async () => {
    const s = onAirIndia()
    render(<LineupToggle state={s} onState={() => undefined} />)
    await userEvent.click(screen.getByRole('button', { name: /India/ }))
    expect(put).toHaveBeenCalledWith(`/api/graphics/match/${s.matchId}/TeamLineup`, { isVisible: false })
  })

  it('tapping the other team switches straight over to it', async () => {
    const s = onAirIndia()
    render(<LineupToggle state={s} onState={() => undefined} />)
    await userEvent.click(screen.getByRole('button', { name: new RegExp(s.awayTeam.name) }))
    expect(put).toHaveBeenCalledWith(`/api/graphics/match/${s.matchId}/TeamLineup`, { isVisible: true, payload: { teamId: awayId(s) } })
  })

  it('a team with no playing XI cannot be put on air', async () => {
    const s = offAir()
    const noXi: MatchState = { ...s, lineups: { ...s.lineups, away: lineupOf(s.lineups.away.team, []) } }
    render(<LineupToggle state={noXi} onState={() => undefined} />)
    const aus = screen.getByRole('button', { name: new RegExp(s.awayTeam.name) })
    expect(aus).toBeDisabled()
    expect(aus).toHaveTextContent('no XI yet')
    await userEvent.click(aus)
    expect(put).not.toHaveBeenCalled()
  })

  it('has a third toggle for both teams together', async () => {
    const s = offAir()
    const full: MatchState = { ...s, lineups: { ...s.lineups, away: lineupOf(s.lineups.away.team, s.lineups.home.players.map((p) => ({ ...p, playerId: `a${p.playerId}` }))) } }
    render(<LineupToggle state={full} onState={() => undefined} />)
    const toggle = screen.getByRole('button', { name: /Both teams/ })
    expect(toggle).toBeEnabled()
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    expect(put).toHaveBeenCalledWith(`/api/graphics/match/${s.matchId}/TeamLineup`, { isVisible: true, payload: { teamId: 'both' } })
  })

  it('when both are on air the Both toggle reads ON AIR, and tapping it hides them', async () => {
    const s = offAir()
    const onBoth: MatchState = { ...s, graphics: { ...s.graphics, TeamLineup: { isVisible: true, payload: { teamId: 'both' } } } }
    render(<LineupToggle state={onBoth} onState={() => undefined} />)
    const toggle = screen.getByRole('button', { name: /Both teams/ })
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(toggle).toHaveTextContent('ON AIR')
    expect(screen.getByRole('button', { name: /India/ })).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(toggle)
    expect(put).toHaveBeenCalledWith(`/api/graphics/match/${s.matchId}/TeamLineup`, { isVisible: false })
  })

  it('tapping one team while both are on air switches to just that team', async () => {
    const s = offAir()
    const onBoth: MatchState = { ...s, graphics: { ...s.graphics, TeamLineup: { isVisible: true, payload: { teamId: 'both' } } } }
    render(<LineupToggle state={onBoth} onState={() => undefined} />)
    await userEvent.click(screen.getByRole('button', { name: /India/ }))
    expect(put).toHaveBeenCalledWith(`/api/graphics/match/${s.matchId}/TeamLineup`, { isVisible: true, payload: { teamId: 'ind' } })
  })

  it('Both teams is disabled until each team has its playing XI', async () => {
    render(<LineupToggle state={offAir()} onState={() => undefined} />)        // away has just one player in the fixture, but that is an XI of one; remove it
    const s = offAir()
    const noAwayXi: MatchState = { ...s, lineups: { ...s.lineups, away: lineupOf(s.lineups.away.team, []) } }
    cleanup()
    render(<LineupToggle state={noAwayXi} onState={() => undefined} />)
    const toggle = screen.getByRole('button', { name: /Both teams/ })
    expect(toggle).toBeDisabled()
    await userEvent.click(toggle)
    expect(put).not.toHaveBeenCalled()
  })

  it('a failed request is reported and the screen keeps working', async () => {
    put.mockRejectedValue(new Error('Server said no'))
    const onState = vi.fn()
    render(<LineupToggle state={offAir()} onState={onState} />)
    await userEvent.click(screen.getByRole('button', { name: /India/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: /India/ })).toBeEnabled())
    expect(onState).not.toHaveBeenCalled()
  })

  it('ignores a second tap while a request is in flight', async () => {
    let finish: (s: MatchState) => void = () => undefined
    put.mockReturnValue(new Promise<MatchState>((r) => { finish = r }))
    render(<LineupToggle state={offAir()} onState={() => undefined} />)
    const india = screen.getByRole('button', { name: /India/ })
    await userEvent.click(india)
    expect(india).toBeDisabled()
    await userEvent.click(india)
    expect(put).toHaveBeenCalledTimes(1)
    finish(onAirIndia())
    await waitFor(() => expect(india).toBeEnabled())
  })
})
