import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MatchState, PlayerLite } from '../../lib/types'
import { inningsLabel } from '../../lib/scorecard'
import { buildBall } from '../../pages/scorer/buildRequest'
import { DEAD_BALL_MS, useDeadBall } from '../overlay/DeadBallFlash'
import { limitedOversState } from '../overlay/fixtures'
import { Scorebug } from '../overlay/Scorebug'
import { AbsentHurtModal, PenaltyModal, ReviseModal } from './Dialogs'
import NextPlayerPanel from './NextPlayerPanel'
import PreInnings from './PreInnings'
import ScoringPad from './ScoringPad'

afterEach(() => vi.useRealTimers())

const player = (id: string, name: string): PlayerLite => ({ id, name, shortName: name.slice(0, 3), photoUrl: null, isWicketKeeper: false })
const withInnings = (patch: Partial<NonNullable<MatchState['innings']>>): MatchState => {
  const s = limitedOversState()
  return { ...s, innings: { ...s.innings!, ...patch } }
}

describe('short run', () => {
  it('only adds shortRuns to the request when there are some', () => {
    expect(buildBall({ kind: 'runs', runs: 2 }, 'id')).not.toHaveProperty('shortRuns')
    expect(buildBall({ kind: 'runs', runs: 2, shortRuns: 1 }, 'id')).toMatchObject({ runsBat: 2, shortRuns: 1 })
  })

  it('has short-run chips on the pad that send the runs run and the runs taken off', async () => {
    const onAction = vi.fn()
    render(<ScoringPad disabled={false} freeHit={false} shortcuts={false} onAction={onAction} onWicket={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Other run values' }))
    await userEvent.click(screen.getByRole('button', { name: 'Ran 2, 1 short' }))
    expect(onAction).toHaveBeenCalledWith({ kind: 'runs', runs: 2, shortRuns: 1 })
  })
})

describe('penalty runs', () => {
  it('says which side gets them and sends that choice', async () => {
    const onConfirm = vi.fn()
    render(<PenaltyModal battingName="India" bowlingName="Australia" onConfirm={onConfirm} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onConfirm).toHaveBeenLastCalledWith(5, 'Penalty runs', false)
    await userEvent.selectOptions(screen.getByLabelText('Awarded to'), 'fielding')
    expect(screen.getByText(/Australia get the runs in their innings/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }))
    expect(onConfirm).toHaveBeenLastCalledWith(5, 'Penalty runs', true)
  })
})

describe('absent hurt', () => {
  it('marks a player absent and brings him back', async () => {
    const onSet = vi.fn()
    render(<AbsentHurtModal available={[player('a', 'Ana')]} absent={[player('b', 'Bob')]} busy={false} onSet={onSet} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Absent hurt' }))
    expect(onSet).toHaveBeenLastCalledWith('a', true)
    await userEvent.click(screen.getByRole('button', { name: 'Back available' }))
    expect(onSet).toHaveBeenLastCalledWith('b', false)
  })
})

describe('revise overs / target', () => {
  it('cannot be applied until something changes, then sends only what changed', async () => {
    const onConfirm = vi.fn()
    render(<ReviseModal oversNow={20} maxOvers={100} hasTarget targetNow={181} onConfirm={onConfirm} onClose={vi.fn()} />)
    const apply = screen.getByRole('button', { name: 'Apply' })
    expect(apply).toBeDisabled()
    await userEvent.clear(screen.getByLabelText('Overs in this innings'))
    await userEvent.type(screen.getByLabelText('Overs in this innings'), '12')
    await userEvent.clear(screen.getByLabelText('Revised target (runs to win)'))
    await userEvent.type(screen.getByLabelText('Revised target (runs to win)'), '120')
    expect(apply).toBeEnabled()
    await userEvent.click(apply)
    expect(onConfirm).toHaveBeenCalledWith(12, 120, 'Rain interruption (DLS)')
  })

  it('has no target box in the first innings', () => {
    render(<ReviseModal oversNow={20} maxOvers={100} hasTarget={false} targetNow={null} onConfirm={vi.fn()} onClose={vi.fn()} />)
    expect(screen.queryByLabelText('Revised target (runs to win)')).toBeNull()
  })
})

describe('choosing the next batter', () => {
  it('tags a batter who retired hurt and may return', () => {
    render(<NextPlayerPanel kind="batter" players={[player('a', 'Ana'), player('b', 'Bob')]} returning={['b']} busy={false} onPick={vi.fn()} />)
    expect(screen.getByText('Retired hurt · returns')).toBeInTheDocument()
    expect(screen.getAllByText(/Retired hurt/)).toHaveLength(1)
  })
})

describe('Super Over', () => {
  it('offers the Super Over when the match is tied and sends the flag with the openers', async () => {
    const onStart = vi.fn()
    const s = limitedOversState()
    const state: MatchState = {
      ...s, status: 'Completed', resultType: 'Tie', resultText: 'Match tied',
      actions: { ...s.actions, canStartInnings: false, canStartSuperOver: true, nextBattingTeamId: s.awayTeam.id,
        battingXI: [player('p1', 'P One'), player('p2', 'P Two')], fieldingXI: [player('f1', 'F One')] },
    }
    render(<PreInnings state={state} busy={false} matchId="m" onStartMatch={vi.fn()} onStart={onStart} onComplete={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /Match tied: start a Super Over/ })).toBeInTheDocument()
    const [striker, nonStriker, bowler] = screen.getAllByRole('combobox').slice(-3)
    await userEvent.selectOptions(striker!, 'p1'); await userEvent.selectOptions(nonStriker!, 'p2'); await userEvent.selectOptions(bowler!, 'f1')
    await userEvent.click(screen.getByRole('button', { name: 'Start Super Over innings' }))
    expect(onStart).toHaveBeenCalledWith({ battingTeamId: s.awayTeam.id, strikerId: 'p1', nonStrikerId: 'p2', bowlerId: 'f1', superOver: true })
  })
})

describe('overlay labels', () => {
  it('shows SUPER OVER, DLS and FOLLOW-ON chips and a DLS target', () => {
    const { rerender } = render(<Scorebug state={withInnings({ isSuperOver: true })} />)
    expect(screen.getByTestId('super-over-chip')).toHaveTextContent('SUPER OVER')
    rerender(<Scorebug state={withInnings({ isDls: true })} />)
    expect(screen.getByTestId('dls-chip')).toBeInTheDocument()
    expect(screen.getByTestId('target')).toHaveTextContent('TARGET 181 (DLS)')
    rerender(<Scorebug state={withInnings({ isFollowOn: true })} />)
    expect(screen.getByTestId('follow-on-chip')).toBeInTheDocument()
  })

  it('labels a Super Over and a follow-on innings in the scorecard tabs', () => {
    const team = limitedOversState().homeTeam
    expect(inningsLabel({ battingTeam: team, inningsNumber: 3, isSuperOver: true })).toContain('Super Over')
    expect(inningsLabel({ battingTeam: team, inningsNumber: 3, isFollowOn: true })).toContain('f/o')
    expect(inningsLabel({ battingTeam: team, inningsNumber: 1 })).not.toContain('f/o')
  })
})

describe('DEAD BALL flash', () => {
  const stateWith = (deadBalls: number, inningsId = 'i1'): MatchState => withInnings({ deadBalls, inningsId })

  it('shows for a few seconds when the count goes up, not for a count already there on load', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ s }) => useDeadBall(s, true), { initialProps: { s: stateWith(1) } })
    expect(result.current).toBe(false)
    rerender({ s: stateWith(2) })
    expect(result.current).toBe(true)
    act(() => { vi.advanceTimersByTime(DEAD_BALL_MS + 50) })
    expect(result.current).toBe(false)
  })

  it('stays quiet in a new innings and when disabled', () => {
    const { result, rerender } = renderHook(({ s, on }) => useDeadBall(s, on), { initialProps: { s: stateWith(0), on: true } })
    rerender({ s: stateWith(3, 'i2'), on: true })
    expect(result.current).toBe(false)
    rerender({ s: stateWith(4, 'i2'), on: false })
    expect(result.current).toBe(false)
  })
})
