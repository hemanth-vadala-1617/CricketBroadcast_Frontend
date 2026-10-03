import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { describeBurst, describePenalty, EVENT_MS, EventBurst, STRIPE } from './EventBurst'
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

  it('is only the highlighted word: no batter, bowler, score or extras text, for any event', () => {
    for (const [k, l] of [['Four', '4'], ['Six', '6'], ['Wicket', 'W'], ['NoBall', 'NB'], ['Wide', 'WD+4']] as const) {
      const b = describeBurst(withBall('a', k, l))!          // reference innings: no free hit pending
      expect(Object.keys(b).sort()).toEqual(['id', 'kind', 'title'])
    }
  })

  it('a no-ball that gives a free hit adds the one tag that sits ABOVE the words; nothing else does', () => {
    const freeHit = { innings: { ...referenceState().innings!, freeHit: true } }
    expect(describeBurst(withBall('a', 'NoBall', 'NB', freeHit))?.tag).toBe('FREE HIT NEXT BALL')
    expect(describeBurst(withBall('a', 'NoBall', 'NB'))?.tag).toBeUndefined()
    for (const [k, l] of [['Four', '4'], ['Six', '6'], ['Wicket', 'W'], ['Wide', 'WD']] as const)
      expect(describeBurst(withBall('a', k, l, freeHit))?.tag).toBeUndefined()
  })
})

describe('EventBurst', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  const play = (kind: BallKind, label: string, extra: Partial<MatchState> = {}) => {
    const view = render(<EventBurst state={withBall('b1', 'Dot', '0')} />)
    view.rerender(<EventBurst state={withBall('b2', kind, label, { version: 11, ...extra })} />)
    return screen.getByTestId('event-burst')
  }

  it('shows nothing but the word: the burst contains no other text', () => {
    for (const [kind, label, word] of [['Four', '4', 'FOUR'], ['Six', '6', 'SIX'], ['Wicket', 'W', 'OUT!'], ['NoBall', 'NB', 'NO BALL'], ['Wide', 'WD', 'WIDE']] as const) {
      const burst = play(kind, label)
      expect(burst.textContent).toBe(word)
      cleanup()
    }
  })

  it('FREE HIT NEXT BALL is a tag above NO BALL, inside the same stripe', () => {
    const burst = play('NoBall', 'NB', { innings: { ...referenceState().innings!, freeHit: true } })
    expect(burst.textContent).toBe('FREE HIT NEXT BALLNO BALL')            // tag first = on top
    const tag = screen.getByText('FREE HIT NEXT BALL')
    const word = screen.getByText('NO BALL')
    expect(tag.parentElement).toBe(word.parentElement)                      // one group, centred in the stripe together
    expect(tag.compareDocumentPosition(word) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('puts the word exactly in the middle of its stripe (same top and height as the stripe)', () => {
    for (const [kind, label, word, geo] of [
      ['Wicket', 'W', 'OUT!', STRIPE.main], ['Four', '4', 'FOUR', STRIPE.main], ['Six', '6', 'SIX', STRIPE.main],
      ['NoBall', 'NB', 'NO BALL', STRIPE.amber], ['Wide', 'WD', 'WIDE', STRIPE.amber],
    ] as const) {
      const burst = play(kind, label)
      const stripe = burst.querySelector<HTMLElement>('[style*="ev-stripe"]')!
      const band = screen.getByText(word).closest<HTMLElement>('[data-band]')!
      expect(stripe.style.top).toBe(`${geo.top}px`)
      expect(stripe.style.height).toBe(`${geo.height}px`)
      expect(band.style.top).toBe(stripe.style.top)                  // the text band is the stripe's box ...
      expect(band.style.height).toBe(stripe.style.height)
      expect(band.style.placeItems).toBe('center')                   // ... with the word centred in it
      cleanup()
    }
  })

  it('both stripes are centred on the same line, so every highlight sits at the same height', () => {
    const centre = (g: { top: number; height: number }) => g.top + g.height / 2
    expect(centre(STRIPE.amber)).toBe(centre(STRIPE.main))
  })

  it('nudges capital letters up so they look centred, not just are centred', () => {
    play('Wicket', 'W')
    expect(screen.getByText('OUT!').style.paddingBottom).toBe('0.09em')
  })

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

describe('penalty runs', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  const withPenalty = (id: string | null, runs = 5, extra: Partial<MatchState> = {}): MatchState =>
    referenceState({ lastPenalty: id ? { id, runs } : null, ...extra })

  it('is announced as PENALTY with the amount above the word', () => {
    expect(describePenalty(withPenalty('p1', 5))).toEqual({ id: 'p1', kind: 'Penalty', title: 'PENALTY', tag: '+5 RUNS' })
    expect(describePenalty(withPenalty('p1', 1))?.tag).toBe('+1 RUN')
    expect(describePenalty(withPenalty(null))).toBeNull()
    expect(describePenalty(withPenalty('p1', 0))).toBeNull()
    expect(describePenalty(referenceState())).toBeNull()                       // an older server sends no lastPenalty at all
  })

  it('plays for a NEW award: the amount on top, PENALTY below it, in one stripe', () => {
    const { rerender } = render(<EventBurst state={withPenalty(null)} />)
    rerender(<EventBurst state={withPenalty('p1', 5, { version: 11 })} />)
    const burst = screen.getByTestId('event-burst')
    expect(burst).toHaveAttribute('data-kind', 'Penalty')
    expect(burst.textContent).toBe('+5 RUNSPENALTY')                             // tag first = above the word
    const stripe = burst.querySelector<HTMLElement>('[style*="ev-stripe"]')!
    const band = screen.getByText('PENALTY').closest<HTMLElement>('[data-band]')!
    expect(band.style.top).toBe(stripe.style.top)
    expect(band.style.height).toBe(stripe.style.height)
    act(() => { vi.advanceTimersByTime(EVENT_MS + 50) })
    expect(screen.queryByTestId('event-burst')).toBeNull()                      // and it leaves by itself
  })

  it('does not replay a penalty that was already on the board when the page loaded', () => {
    render(<EventBurst state={withPenalty('p1', 5)} />)
    expect(screen.queryByTestId('event-burst')).toBeNull()
  })

  it('plays again for the next award (new id) but not for a re-sent state of the same one', () => {
    const { rerender } = render(<EventBurst state={withPenalty('p1', 5)} />)
    rerender(<EventBurst state={withPenalty('p1', 5, { version: 12 })} />)
    expect(screen.queryByTestId('event-burst')).toBeNull()                      // same award re-sent: nothing
    rerender(<EventBurst state={withPenalty('p2', 5, { version: 13 })} />)
    expect(screen.getByTestId('event-burst')).toHaveAttribute('data-kind', 'Penalty')
  })

  it('shows nothing when the penalty is taken back (a correction clears lastPenalty)', () => {
    const { rerender } = render(<EventBurst state={withPenalty('p1', 5)} />)
    rerender(<EventBurst state={withPenalty(null, 0, { version: 14 })} />)
    expect(screen.queryByTestId('event-burst')).toBeNull()
  })

  it('a ball and a penalty each get their own burst', () => {
    const { rerender } = render(<EventBurst state={withBall('b1', 'Dot', '0')} />)
    rerender(<EventBurst state={withBall('b2', 'Six', '6', { version: 11 })} />)
    expect(screen.getByTestId('event-burst')).toHaveAttribute('data-kind', 'Six')
    rerender(<EventBurst state={withBall('b2', 'Six', '6', { version: 12, lastPenalty: { id: 'p9', runs: 5 } })} />)
    expect(screen.getByTestId('event-burst')).toHaveAttribute('data-kind', 'Penalty')
  })
})