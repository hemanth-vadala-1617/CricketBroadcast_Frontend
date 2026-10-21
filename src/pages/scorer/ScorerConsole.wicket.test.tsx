import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatchState } from '../../lib/types'
import { referenceState } from '../../components/overlay/fixtures'

const post = vi.fn()
const apply = vi.fn()
let current: MatchState

vi.mock('../../lib/api', async (orig) => {
  const real = await orig<typeof import('../../lib/api')>()
  return { ...real, api: { ...real.api, post: (...a: unknown[]) => post(...a), get: vi.fn(), put: vi.fn() } }
})
vi.mock('../../hooks/useLiveMatch', () => ({ useLiveMatch: () => ({ state: current, status: 'live', apply }) }))
// the TV preview is an iframe of another page; not needed here
vi.mock('../../components/scorer/ScoreStrip', () => ({ default: () => null }))

import ScorerConsole from './ScorerConsole'

const p = (id: string, name: string) => ({ id, name, shortName: name, photoUrl: null, isWicketKeeper: false })

function liveState(freeHit: boolean): MatchState {
  const base = referenceState()
  return {
    ...base,
    innings: { ...base.innings!, freeHit },
    actions: {
      ...base.actions, canScoreBall: true, canUndo: true, awaitingNewBatter: false, awaitingNewBowler: false,
      availableBatters: [p('n1', 'Rohit Sharma'), p('n2', 'Hardik Pandya')],
      fieldingXI: [p('f1', 'Adam Zampa'), p('f2', 'Alex Carey')], battingXI: [], eligibleBowlers: [],
    },
  }
}

function open() {
  return render(<MemoryRouter initialEntries={['/scorer/m1']}><Routes><Route path="/scorer/:matchId" element={<ScorerConsole />} /></Routes></MemoryRouter>)
}

beforeEach(() => { post.mockReset(); apply.mockReset(); post.mockResolvedValue(liveState(false)) })

describe('recording a wicket from the scorer console', () => {
  it.each([
    ['Obstructing', 'ObstructingField', true],
    ['Run out', 'RunOut', true],
    ['Bowled', 'Bowled', false],
  ])('%s: Confirm wicket sends the ball and closes the dialog', async (label, type, freeHit) => {
    current = liveState(freeHit)
    open()
    await userEvent.click(screen.getByRole('button', { name: 'Wicket' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: label }))
    expect(within(dialog).queryByLabelText('Incoming batter')).toBeNull()   // chosen later, in the side panel
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm wicket' }))

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    const [url, body] = post.mock.calls[0]!
    expect(url).toBe('/api/scoring/match/m1/ball')
    expect(body.wicket).toMatchObject({ dismissalType: type, newBatterId: null })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(apply).toHaveBeenCalled()
  })

  it('shows the server error inside the dialog when the ball is rejected', async () => {
    current = liveState(false)
    post.mockRejectedValue(Object.assign(new Error('boom'), { status: 422, message: 'The dismissed batter must be at the crease.' }))
    open()
    await userEvent.click(screen.getByRole('button', { name: 'Wicket' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Bowled' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm wicket' }))
    expect(await within(dialog).findByRole('alert')).toBeInTheDocument()
  })
})

describe('who is next after a wicket or an over', () => {
  it('shows "Select batter" as a card in the page (no pop-up), keeps the pad locked, and picks only on a tap', async () => {
    const base = liveState(false)
    current = { ...base, actions: { ...base.actions, canScoreBall: false, awaitingNewBatter: true } }
    open()
    expect(screen.queryByRole('dialog')).toBeNull()
    const panel = screen.getByTestId('select-batter')
    expect(panel).toHaveTextContent('Select batter')
    expect(post).not.toHaveBeenCalled()
    await userEvent.click(within(panel).getByRole('button', { name: /Rohit Sharma/ }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/scoring/match/m1/new-batter', { playerId: 'n1' }))
  })

  it('shows "Select bowler" the same way after an over', async () => {
    const base = liveState(false)
    current = { ...base, actions: { ...base.actions, canScoreBall: false, awaitingNewBowler: true, eligibleBowlers: [p('b1', 'Pat Cummins')] } }
    open()
    expect(screen.queryByRole('dialog')).toBeNull()
    const panel = screen.getByTestId('select-bowler')
    await userEvent.click(within(panel).getByRole('button', { name: /Pat Cummins/ }))
    await waitFor(() => expect(post).toHaveBeenCalledWith('/api/scoring/match/m1/new-bowler', { playerId: 'b1', replaceMidOver: false }))
  })

  it('shows nothing when nobody is needed', () => {
    current = liveState(false)
    open()
    expect(screen.queryByTestId('select-batter')).toBeNull()
    expect(screen.queryByTestId('select-bowler')).toBeNull()
  })
})
