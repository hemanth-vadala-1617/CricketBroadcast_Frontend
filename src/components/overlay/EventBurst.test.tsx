import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { describeBurst, EVENT_MS, EventBurst } from './EventBurst'
import { referenceState } from './fixtures'
import type { BallKind, MatchState } from '../../lib/types'

const withBall = (id: string, kind: BallKind, label: string, extra: Partial<MatchState> = {}): MatchState =>
  referenceState({ lastBall: { ballId: id, label, kind, runs: 0 }, ...extra })

describe('describeBurst', () => {
  it('has a burst for FOUR, SIX, OUT, NO BALL and WIDE only', () => {
    expect(describeBurst(withBall('a', 'Four', '4'))?.title).toBe('FOUR')
    expect(describeBurst(withBall('a', 'Six', '6'))?.title).toBe('SIX')
    expect(describeBurst(withBall('a', 'Wicket', 'W'))?.title).toBe('OUT!')
    expect(describeBurst(withBall('a', 'NoBall', 'NB'))?.title).toBe('NO BALL')
    expect(describeBurst(withBall('a', 'Wide', 'WD'))?.title).toBe('WIDE')
    for (const k of ['Dot', 'Runs', 'Bye', 'LegBye'] as BallKind[]) expect(describeBurst(withBall('a', k, '1'))).toBeNull()
    expect(describeBurst(referenceState({ lastBall: null }))).toBeNull()
  })

  it('shows the score on a boundary', () => {
    expect(describeBurst(withBall('a', 'Four', '4'))?.lines).toEqual(['BAN 355-7'])
  })

  it('names the dismissed batter, his score and how he got out', () => {
    const base = referenceState()
    const card = base.scorecard[0] ?? {
      inningsNumber: 2, battingTeam: base.innings!.battingTeam, runs: 355, wickets: 7, overs: '114.1', extras: 12, extrasText: '', isCompleted: false,
      batting: [], bowling: [], fallOfWickets: [], yetToBat: [],
    }
    const s = withBall('w1', 'Wicket', 'W', {
      scorecard: [{
        ...card,
        fallOfWickets: [{ wicketNumber: 7, score: 355, overs: '114.1', batterName: 'Mehidy Hasan' }],
        batting: [{ playerId: 'p1', name: 'Mehidy Hasan', runs: 34, balls: 80, fours: 3, sixes: 0, strikeRate: 42.5, status: 'out', dismissalText: 'c Carey b Cummins' }],
      }],
    })
    const b = describeBurst(s)!
    expect(b.lines[0]).toBe('Mehidy Hasan  34 (80)')
    expect(b.lines).toContain('c Carey b Cummins')
    expect(b.lines).toContain('BAN 355-7')
  })

  it('announces a free hit after a no-ball and the extra runs on a wide', () => {
    const nb = withBall('n', 'NoBall', 'NB', { innings: { ...referenceState().innings!, freeHit: true } })
    expect(describeBurst(nb)?.lines[0]).toBe('FREE HIT NEXT BALL')
    expect(describeBurst(withBall('n', 'NoBall', 'NB'))?.lines).not.toContain('FREE HIT NEXT BALL')
    expect(describeBurst(withBall('w', 'Wide', 'WD+4'))?.lines[0]).toBe('+4 runs')
  })
})

describe('EventBurst', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('does not replay the ball that was already last when the page loaded', () => {
    render(<EventBurst state={withBall('b1', 'Six', '6')} />)
    expect(screen.queryByTestId('event-burst')).toBeNull()
  })

  it('plays once for a NEW ball, then leaves by itself', () => {
    const { rerender } = render(<EventBurst state={withBall('b1', 'Dot', '0')} />)
    rerender(<EventBurst state={withBall('b2', 'Four', '4', { version: 11 })} />)
    expect(screen.getByTestId('event-burst')).toHaveAttribute('data-kind', 'Four')
    expect(screen.getByText('FOUR')).toBeInTheDocument()
    act(() => { vi.advanceTimersByTime(EVENT_MS + 50) })
    expect(screen.queryByTestId('event-burst')).toBeNull()
  })

  it('a newer event replaces one still on screen', () => {
    const { rerender } = render(<EventBurst state={withBall('b1', 'Dot', '0')} />)
    rerender(<EventBurst state={withBall('b2', 'Four', '4', { version: 11 })} />)
    act(() => { vi.advanceTimersByTime(1000) })
    rerender(<EventBurst state={withBall('b3', 'Wicket', 'W', { version: 12 })} />)
    expect(screen.getByTestId('event-burst')).toHaveAttribute('data-kind', 'Wicket')
  })

  it('does not replay an old event when an undo makes it the last ball again', () => {
    const { rerender } = render(<EventBurst state={withBall('b1', 'Six', '6')} />)   // loaded with a six already last
    rerender(<EventBurst state={withBall('b2', 'Dot', '0', { version: 11 })} />)
    rerender(<EventBurst state={withBall('b1', 'Six', '6', { version: 12 })} />)    // undo of b2: the six is last again
    expect(screen.queryByTestId('event-burst')).toBeNull()
  })

  it('a later state version for the same ball does not restart the animation', () => {
    const { rerender } = render(<EventBurst state={withBall('b1', 'Dot', '0')} />)
    rerender(<EventBurst state={withBall('b2', 'Six', '6', { version: 11 })} />)
    act(() => { vi.advanceTimersByTime(2000) })
    rerender(<EventBurst state={withBall('b2', 'Six', '6', { version: 12 })} />)    // e.g. the producer toggled a graphic
    act(() => { vi.advanceTimersByTime(EVENT_MS - 2000 + 50) })
    expect(screen.queryByTestId('event-burst')).toBeNull()
  })

  it('plays for NO BALL and WIDE too', () => {
    const { rerender } = render(<EventBurst state={withBall('b1', 'Dot', '0')} />)
    rerender(<EventBurst state={withBall('b2', 'NoBall', 'NB', { version: 11 })} />)
    expect(screen.getByText('NO BALL')).toBeInTheDocument()
    rerender(<EventBurst state={withBall('b3', 'Wide', 'WD', { version: 12 })} />)
    expect(screen.getByText('WIDE')).toBeInTheDocument()
  })
})
