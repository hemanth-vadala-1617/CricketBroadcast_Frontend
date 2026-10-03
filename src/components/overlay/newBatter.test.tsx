import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Batter, MatchState } from '../../lib/types'
import { NewBatterCard } from './NewBatterCard'
import { detectArrival } from './newBatter'
import { referenceState } from './fixtures'

const batter = (id: string, over: Partial<Batter> = {}): Batter => ({
  playerId: id, name: `Player ${id}`, shortName: id, photoUrl: null, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, onStrike: false,
  firstName: '', lastName: '', jerseyNumber: 0, battingStyle: '', career: null, ...over,
})

function stateWith(striker: Batter | null, nonStriker: Batter | null, inningsId = 'i1'): MatchState {
  const base = referenceState()
  return { ...base, innings: { ...base.innings!, inningsId, striker, nonStriker } }
}

describe('detectArrival', () => {
  it('stays quiet for the openers and on a first look', () => {
    const first = detectArrival(null, stateWith(batter('a'), batter('b')))
    expect(first.arrival).toBeNull()
    expect(first.watch?.present.length).toBe(2)
  })

  it('announces a batter who was not at the crease before', () => {
    const w = detectArrival(null, stateWith(batter('a'), batter('b'))).watch
    const afterWicket = detectArrival(w, stateWith(null, batter('b')))
    expect(afterWicket.arrival).toBeNull()
    const arrived = detectArrival(afterWicket.watch, stateWith(batter('c'), batter('b')))
    expect(arrived.arrival?.batter.playerId).toBe('c')
    // and does not announce the same batter again
    expect(detectArrival(arrived.watch, stateWith(batter('c', { balls: 1 }), batter('b'))).arrival).toBeNull()
  })

  it('does not announce a batter who is coming back with runs on the board', () => {
    const w = detectArrival(null, stateWith(batter('a'), batter('b'))).watch
    const back = detectArrival(w, stateWith(batter('a'), batter('c', { runs: 12, balls: 9 })))
    expect(back.arrival).toBeNull()
  })

  it('starts afresh for a new innings', () => {
    const w = detectArrival(null, stateWith(batter('a'), batter('b'), 'i1')).watch
    const next = detectArrival(w, stateWith(batter('x'), batter('y'), 'i2'))
    expect(next.arrival).toBeNull()
    expect(next.watch?.inningsId).toBe('i2')
  })
})

describe('NewBatterCard', () => {
  it('shows name, number, style and only the career rows that were entered', () => {
    const b = batter('c', { firstName: 'Shreyas', lastName: 'Iyer', jerseyNumber: 41, battingStyle: 'Right handed batter', career: { label: 'T20I', matches: 51, runs: 1104, average: 31.54, strikeRate: null, fifties: 8, hundreds: 1 } })
    render(<NewBatterCard batter={b} state={stateWith(b, batter('b'))} />)
    expect(screen.getByText('Iyer')).toBeInTheDocument()
    expect(screen.getByText('Shreyas')).toBeInTheDocument()
    expect(screen.getByText('41')).toBeInTheDocument()
    expect(screen.getByText('Right handed batter')).toBeInTheDocument()
    expect(screen.getByText('T20I CAREER')).toBeInTheDocument()
    expect(screen.getByText('1104')).toBeInTheDocument()
    expect(screen.getByText('31.54')).toBeInTheDocument()
    expect(screen.getByText('8 / 1')).toBeInTheDocument()
    expect(screen.queryByText('STRIKE RATE')).toBeNull()
  })

  it('has no career block when none was entered', () => {
    const b = batter('c', { firstName: 'Axar', lastName: 'Patel' })
    render(<NewBatterCard batter={b} state={stateWith(b, batter('b'))} />)
    expect(screen.queryByText(/CAREER/)).toBeNull()
  })
})

describe('NewBatterCard with an older API', () => {
  it('does not crash when the new batter fields are missing from the state', () => {
    const old = { playerId: 'c', name: 'Axar Patel', shortName: 'A Patel', photoUrl: null, runs: 0, balls: 0, fours: 0, sixes: 0, strikeRate: 0, onStrike: false } as unknown as Batter
    render(<NewBatterCard batter={old} state={stateWith(old, batter('b'))} />)
    expect(screen.getByText('Patel')).toBeInTheDocument()
  })
})

describe('BroadcastOverlay new batter flow', () => {
  it('shows the card after a wicket once the next batter is chosen', async () => {
    const { BroadcastOverlay } = await import('./BroadcastOverlay')
    const a = stateWith(batter('a', { onStrike: true }), batter('b'))
    const { rerender } = render(<BroadcastOverlay state={a} />)
    expect(screen.queryByTestId('new-batter-card')).toBeNull()
    rerender(<BroadcastOverlay state={stateWith(null, batter('b'))} />)
    expect(screen.queryByTestId('new-batter-card')).toBeNull()
    rerender(<BroadcastOverlay state={stateWith(batter('c', { onStrike: true, firstName: 'Axar', lastName: 'Patel' }), batter('b'))} />)
    expect(await screen.findByTestId('new-batter-card')).toBeInTheDocument()
  })
})

describe('departing batter stays on his card until the introduction ends', () => {
  it('holds the dismissed batter (marked OUT) from the wicket until 1.5 seconds into the new batter introduction', async () => {
    vi.useFakeTimers()
    try {
      const { BroadcastOverlay } = await import('./BroadcastOverlay')
      const withWicket = (s: MatchState): MatchState => ({
        ...s,
        lastBall: { ballId: 'x', label: 'W', kind: 'Wicket', runs: 0 },
        scorecard: [{ ...(s.scorecard[0] ?? {}), inningsNumber: s.innings!.inningsNumber, batting: [{ playerId: 'a', name: 'Player a', isCaptain: false, isWicketKeeper: false, runs: 21, balls: 14, fours: 2, sixes: 1, strikeRate: 150, status: 'out', dismissalText: 'b Starc' }] } as MatchState['scorecard'][number]],
      })
      const a = stateWith(batter('a', { onStrike: true, runs: 20, balls: 13 }), batter('b'))
      const { rerender } = render(<BroadcastOverlay state={a} />)
      // wicket, and the new batter chosen in the same step
      rerender(<BroadcastOverlay state={withWicket(stateWith(batter('c', { onStrike: true, firstName: 'Axar', lastName: 'Patel' }), batter('b')))} />)
      // the bottom card still shows the dismissed batter, with OUT
      expect(screen.getByTestId('out-badge')).toHaveTextContent('OUT')
      expect(screen.getByText('Player a')).toBeInTheDocument()
      expect(screen.getByText('b Starc')).toBeInTheDocument()
      expect(screen.queryByTestId('new-batter-card')).toBeNull()
      // OUT burst clears, then the introduction appears; the old card is still held
      act(() => { vi.advanceTimersByTime(4100) })
      expect(screen.getByTestId('new-batter-card')).toBeInTheDocument()
      expect(screen.getByTestId('out-badge')).toBeInTheDocument()
      // 1.5 seconds into the introduction the bottom card switches to the new batter, while the introduction carries on
      act(() => { vi.advanceTimersByTime(1600) })
      expect(screen.getByTestId('new-batter-card')).toBeInTheDocument()
      expect(screen.queryByTestId('out-badge')).toBeNull()
      expect(screen.getAllByText('Player c').length).toBeGreaterThan(0)
      // then the introduction ends
      act(() => { vi.advanceTimersByTime(5500) })
      expect(screen.queryByTestId('new-batter-card')).toBeNull()
    } finally { vi.useRealTimers() }
  })

  it('still introduces a batter when a wicket is undone and scored again', () => {
    const ab = stateWith(batter('a', { runs: 8, balls: 6 }), batter('b'))
    const afterWicket = detectArrival(detectArrival(null, ab).watch, stateWith(batter('c'), batter('b')))
    expect(afterWicket.arrival?.batter.playerId).toBe('c')
    const afterUndo = detectArrival(afterWicket.watch, ab)
    expect(afterUndo.arrival).toBeNull()
    const again = detectArrival(afterUndo.watch, stateWith(batter('c'), batter('b')))
    expect(again.arrival?.batter.playerId).toBe('c')
  })
})
