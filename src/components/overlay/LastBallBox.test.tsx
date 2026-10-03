import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HIGHLIGHT_MS, LastBallBox } from './LastBallBox'
import { ballStyle, reelDigits, sparkVectors } from './lastBallStyle'
import { referenceState } from './fixtures'
import type { BallKind, MatchState } from '../../lib/types'

const withBall = (id: string, kind: BallKind, label: string): MatchState =>
  referenceState({ lastBall: { ballId: id, label, kind, runs: 0 } })

// Renders a Dot first, then the event, so the event counts as a NEW ball (that is what starts the highlight).
function showEvent(kind: BallKind, label: string) {
  const view = render(<LastBallBox state={withBall('b1', 'Dot', '0')} />)
  view.rerender(<LastBallBox state={withBall('b2', kind, label)} />)
  return view
}

describe('ballStyle', () => {
  it('gives FOUR, SIX, WICKET and NO BALL their own flair, and plain runs none', () => {
    expect(ballStyle('Four')?.flair).toBe('ring')
    expect(ballStyle('Six')?.flair).toBe('foil')
    expect(ballStyle('Wicket')?.flair).toBe('glitch')
    expect(ballStyle('NoBall')?.flair).toBe('march')
    expect(ballStyle('Wide')?.flair).toBe('march')
    for (const k of ['Dot', 'Runs', 'Bye', 'LegBye'] as BallKind[]) expect(ballStyle(k)).toBeNull()
    expect(ballStyle(undefined)).toBeNull()
  })

  it('uses four different looks and four different label motions', () => {
    const kinds = ['Four', 'Six', 'Wicket', 'NoBall'] as BallKind[]
    expect(new Set(kinds.map((k) => `${ballStyle(k)!.bg}|${ballStyle(k)!.glow}`)).size).toBe(4)
    expect(new Set(kinds.map((k) => ballStyle(k)!.intro.split(' ')[0])).size).toBe(4)
  })

  it('keeps the box motion separate from the full-screen bursts, which use the ev- animations', () => {
    for (const k of ['Four', 'Six', 'Wicket', 'NoBall', 'Wide'] as BallKind[]) expect(ballStyle(k)!.intro.startsWith('lb-')).toBe(true)
  })
})

describe('odometer and sparks (helpers)', () => {
  it('rolls through every number up to the result', () => {
    expect(reelDigits('6')).toEqual(['0', '1', '2', '3', '4', '5', '6'])
    expect(reelDigits('4')).toEqual(['0', '1', '2', '3', '4'])
    expect(reelDigits('0')).toEqual(['0'])
  })
  it('only rolls a single digit', () => {
    expect(reelDigits('W')).toBeNull()
    expect(reelDigits('NB')).toBeNull()
    expect(reelDigits('WD+4')).toBeNull()
    expect(reelDigits('10')).toBeNull()
  })
  it('throws sparks in ten different directions', () => {
    const v = sparkVectors()
    expect(v).toHaveLength(10)
    expect(new Set(v.map((s) => `${s.dx},${s.dy}`)).size).toBe(10)
  })
})

describe('LastBallBox', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  const flairOf = (kind: BallKind, label: string) => {
    const view = showEvent(kind, label)
    const box = screen.getByTestId('last-ball')
    const out = { flair: box.getAttribute('data-flair'), highlight: box.getAttribute('data-highlight') }
    view.unmount()
    return out
  }

  it('highlights a four, six, wicket and no-ball each with its own flair', () => {
    expect(flairOf('Four', '4')).toEqual({ flair: 'ring', highlight: 'true' })
    expect(flairOf('Six', '6')).toEqual({ flair: 'foil', highlight: 'true' })
    expect(flairOf('Wicket', 'W')).toEqual({ flair: 'glitch', highlight: 'true' })
    expect(flairOf('NoBall', 'NB')).toEqual({ flair: 'march', highlight: 'true' })
  })

  it('does not highlight a dot or a single', () => {
    expect(flairOf('Dot', '0')).toEqual({ flair: 'none', highlight: 'false' })
    expect(flairOf('Runs', '1')).toEqual({ flair: 'none', highlight: 'false' })
  })

  it('FOUR flips the number, with a gleam and a pulse ring', () => {
    showEvent('Four', '4')
    expect(screen.getByText('4').style.animation).toContain('lb-flip3d')
    expect(screen.getByTestId('gleam')).toBeInTheDocument()
    expect(screen.getByTestId('ring')).toBeInTheDocument()
    expect(screen.queryByTestId('reel')).toBeNull()
  })

  it('SIX rolls like an odometer from 0 to 6, with gold foil and ten sparks (no ring, no gleam)', () => {
    showEvent('Six', '6')
    const reel = within(screen.getByTestId('reel'))
    for (const d of ['0', '1', '2', '3', '4', '5', '6']) expect(reel.getByText(d)).toBeInTheDocument()
    expect((screen.getByTestId('reel').firstElementChild as HTMLElement).style.animation).toContain('lb-reel')
    expect(screen.getAllByTestId('spark')).toHaveLength(10)
    expect(screen.queryByTestId('ring')).toBeNull()
    expect(screen.queryByTestId('gleam')).toBeNull()
  })

  it('OUT glitches the letter under scanlines', () => {
    showEvent('Wicket', 'W')
    expect(screen.getByText('W').style.animation).toContain('lb-glitch')
    expect(screen.getByTestId('scanlines')).toBeInTheDocument()
    expect(screen.queryByTestId('spark')).toBeNull()
  })

  it('NO BALL and WIDE blink on marching stripes', () => {
    showEvent('NoBall', 'NB')
    expect(screen.getByText('NB').style.animation).toContain('lb-blink')
    expect(screen.getByTestId('stripes')).toBeInTheDocument()
  })

  it('settles after the highlight but keeps a coloured border so the event stays recognisable', () => {
    showEvent('Six', '6')
    act(() => { vi.advanceTimersByTime(HIGHLIGHT_MS + 50) })
    const box = screen.getByTestId('last-ball')
    expect(box).toHaveAttribute('data-highlight', 'false')
    expect(box).toHaveAttribute('data-settled', 'true')
    expect(box).toHaveAttribute('data-kind', 'Six')
    expect(screen.queryByTestId('reel')).toBeNull()                        // the odometer does not replay
    expect(screen.queryByTestId('spark')).toBeNull()
    expect(screen.getByText('6').style.animation).toBe('')
  })

  it('has no event styling for a plain ball', () => {
    render(<LastBallBox state={withBall('b1', 'Runs', '2')} />)
    expect(screen.getByTestId('last-ball')).toHaveAttribute('data-settled', 'false')
  })

  describe('waits for the full-screen burst to finish', () => {
    const BURST = 3800
    const delayed = (s: MatchState) => <LastBallBox state={s} delayMs={BURST} />

    it('holds the previous result while the burst plays, then switches and plays its own motion', () => {
      const { rerender } = render(delayed(withBall('b1', 'Runs', '2')))
      rerender(delayed(withBall('b2', 'Six', '6')))
      let box = screen.getByTestId('last-ball')
      expect(box).toHaveAttribute('data-highlight', 'false')
      expect(box).toHaveTextContent('2')                               // still the previous ball: the burst owns the screen
      expect(screen.queryByTestId('reel')).toBeNull()
      expect(screen.queryByTestId('spark')).toBeNull()

      act(() => { vi.advanceTimersByTime(BURST - 1) })
      expect(screen.getByTestId('last-ball')).toHaveAttribute('data-highlight', 'false')
      expect(screen.getByTestId('last-ball')).toHaveTextContent('2')

      act(() => { vi.advanceTimersByTime(1) })                         // the burst has just left the screen
      box = screen.getByTestId('last-ball')
      expect(box).toHaveAttribute('data-highlight', 'true')
      expect(box).toHaveAttribute('data-flair', 'foil')
      expect(screen.getByTestId('reel')).toBeInTheDocument()
      expect(screen.getAllByTestId('spark')).toHaveLength(10)
    })

    it('then settles HIGHLIGHT_MS later, as without a delay', () => {
      const { rerender } = render(delayed(withBall('b1', 'Dot', '0')))
      rerender(delayed(withBall('b2', 'Four', '4')))
      act(() => { vi.advanceTimersByTime(BURST) })
      expect(screen.getByTestId('last-ball')).toHaveAttribute('data-highlight', 'true')
      act(() => { vi.advanceTimersByTime(HIGHLIGHT_MS) })
      expect(screen.getByTestId('last-ball')).toHaveAttribute('data-settled', 'true')
    })

    it('updates a dot or a single at once, because no burst plays for them', () => {
      const { rerender } = render(delayed(withBall('b1', 'Six', '6')))
      rerender(delayed(withBall('b2', 'Runs', '1')))
      expect(screen.getByTestId('last-ball')).toHaveTextContent('1')
      expect(screen.getByTestId('last-ball')).toHaveAttribute('data-highlight', 'false')
    })

    it('a newer ball cancels the pending highlight (no stale animation for the old ball)', () => {
      const { rerender } = render(delayed(withBall('b1', 'Dot', '0')))
      rerender(delayed(withBall('b2', 'Six', '6')))
      act(() => { vi.advanceTimersByTime(1000) })
      rerender(delayed(withBall('b3', 'Runs', '1')))
      act(() => { vi.advanceTimersByTime(BURST * 2) })
      const box = screen.getByTestId('last-ball')
      expect(box).toHaveTextContent('1')
      expect(box).toHaveAttribute('data-highlight', 'false')
      expect(screen.queryByTestId('reel')).toBeNull()
    })

    it('a re-sent state for the same ball does not restart or cancel the wait', () => {
      const { rerender } = render(delayed(withBall('b1', 'Dot', '0')))
      rerender(delayed(withBall('b2', 'Wicket', 'W')))
      act(() => { vi.advanceTimersByTime(2000) })
      rerender(delayed({ ...withBall('b2', 'Wicket', 'W'), version: 99 }))
      act(() => { vi.advanceTimersByTime(BURST - 2000) })
      expect(screen.getByTestId('last-ball')).toHaveAttribute('data-flair', 'glitch')
    })
  })

  it('does not replay for the ball that was already last on load, nor for a re-sent state', () => {
    const { rerender } = render(<LastBallBox state={withBall('b1', 'Six', '6')} />)
    expect(screen.getByTestId('last-ball')).toHaveAttribute('data-highlight', 'false')
    rerender(<LastBallBox state={{ ...withBall('b1', 'Six', '6'), version: 99 }} />)
    expect(screen.getByTestId('last-ball')).toHaveAttribute('data-highlight', 'false')
  })
})
