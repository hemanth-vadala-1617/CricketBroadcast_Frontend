import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { describeBurst, describePenalty, describePowerSurge, EVENT_MS, EventBurst, STRIPE } from './EventBurst'
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
describe('sixes in a row', () => {
  const sixState = (streak?: number): MatchState => ({ ...referenceState(), lastBall: { ballId: `six-${streak ?? 0}`, label: '6', kind: 'Six', runs: 6, sixStreak: streak } })

  it('a single six (or an older API with no streak) is the normal SIX', () => {
    expect(describeBurst(sixState(1))).toMatchObject({ kind: 'Six', title: 'SIX' })
    expect(describeBurst(sixState(undefined))?.streak).toBeUndefined()
  })

  it('two in a row is BACK-TO-BACK SIXES, more is N IN A ROW', () => {
    expect(describeBurst(sixState(2))).toMatchObject({ kind: 'Six', title: 'SIXES', tag: 'BACK-TO-BACK', streak: 2 })
    expect(describeBurst(sixState(4))).toMatchObject({ title: 'SIXES', tag: '4 IN A ROW', streak: 4 })
  })

  it('draws one 6 badge per six on screen', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<EventBurst state={{ ...referenceState(), lastBall: null }} />)
      rerender(<EventBurst state={sixState(4)} />)
      const streak = screen.getByTestId('six-streak')
      expect(streak.textContent).toContain('4 IN A ROW')
      expect(streak.textContent).toContain('SIXES')
      expect(streak.querySelectorAll('span[style*="radial-gradient"]')).toHaveLength(4)
    } finally { vi.useRealTimers() }
  })
})

describe('no-ball siren', () => {
  it('plays the siren once for a new no-ball and not for other balls or one already there on load', async () => {
    const sound = await import('../../lib/sound')
    const spy = vi.spyOn(sound, 'playSiren').mockImplementation(() => {})
    try {
      const { rerender } = render(<EventBurst state={withBall('nb0', 'NoBall', 'NB')} />)
      expect(spy).not.toHaveBeenCalled()                                  // already last when the page loaded
      rerender(<EventBurst state={withBall('four', 'Four', '4')} />)
      expect(spy).not.toHaveBeenCalled()
      rerender(<EventBurst state={withBall('nb1', 'NoBall', 'NB')} />)
      expect(spy).toHaveBeenCalledTimes(1)
      rerender(<EventBurst state={withBall('nb1', 'NoBall', 'NB', { version: 99 })} />)
      expect(spy).toHaveBeenCalledTimes(1)                                // a later state update does not replay it
    } finally { spy.mockRestore() }
  })
})

describe('hat-tricks', () => {
  const ball = (kind: BallKind, extra: Partial<NonNullable<MatchState['lastBall']>>): MatchState => ({ ...referenceState(), lastBall: { ballId: `h-${kind}-${JSON.stringify(extra)}`, label: 'x', kind, runs: 0, ...extra } })

  it('three sixes in a row by one batter is the sixes hat-trick; four in a row goes back to the streak wording', () => {
    expect(describeBurst(ball('Six', { sixStreak: 3 }))).toMatchObject({ hatTrick: true, title: 'SIXES', tag: 'HAT-TRICK OF' })
    expect(describeBurst(ball('Six', { sixStreak: 4 }))).toMatchObject({ title: 'SIXES', tag: '4 IN A ROW' })
    expect(describeBurst(ball('Six', { sixStreak: 4 }))?.hatTrick).toBeUndefined()
  })

  it('three fours in a row is the fours hat-trick; two is just a four', () => {
    expect(describeBurst(ball('Four', { fourStreak: 3 }))).toMatchObject({ hatTrick: true, title: 'FOURS' })
    expect(describeBurst(ball('Four', { fourStreak: 2 }))).toMatchObject({ title: 'FOUR' })
    expect(describeBurst(ball('Four', { fourStreak: 2 }))?.hatTrick).toBeUndefined()
  })

  it('a bowler on two wickets is "on a hat-trick"; the third wicket is the hat-trick', () => {
    expect(describeBurst(ball('Wicket', { wicketStreak: 2 }))).toMatchObject({ title: 'OUT!', tag: 'ON A HAT-TRICK' })
    expect(describeBurst(ball('Wicket', { wicketStreak: 3 }))).toMatchObject({ hatTrick: true, title: 'HAT-TRICK!' })
    expect(describeBurst(ball('Wicket', { wicketStreak: 1 }))?.tag).toBeUndefined()
  })

  it('draws three badges and the bowler name for a wicket hat-trick', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<EventBurst state={{ ...referenceState(), lastBall: null }} />)
      rerender(<EventBurst state={ball('Wicket', { wicketStreak: 3 })} />)
      const hat = screen.getByTestId('hat-trick')
      expect(hat.querySelectorAll('[data-hat-badge]')).toHaveLength(3)
      expect(hat.textContent).toContain('HAT-TRICK FOR')
      expect(hat.textContent).toContain('Pat Cummins')
    } finally { vi.useRealTimers() }
  })
})

describe('BBL Power Surge', () => {
  const surgeState = (over: Partial<NonNullable<NonNullable<MatchState['innings']>['powerSurge']>> | null): MatchState => {
    const base = referenceState()
    return { ...base, innings: { ...base.innings!, powerSurge: over === null ? null : { active: true, used: true, canStart: false, canCancel: false, startOver: 12, overs: 2, oversLeft: 2, ...over } } }
  }

  it('is announced once when the surge becomes active, not on load, and not again on later updates', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<EventBurst state={surgeState({ active: false, used: false })} />)
      expect(screen.queryByTestId('power-surge-burst')).toBeNull()
      rerender(<EventBurst state={surgeState({})} />)
      const burst = screen.getByTestId('power-surge-burst')
      expect(burst.textContent).toContain('POWER SURGE')
      expect(burst.textContent).toContain('2 OVERS OF FIELD RESTRICTIONS')
      act(() => { vi.advanceTimersByTime(EVENT_MS + 200) })
      expect(screen.queryByTestId('power-surge-burst')).toBeNull()
      rerender(<EventBurst state={{ ...surgeState({ oversLeft: 1 }), version: 99 }} />)
      expect(screen.queryByTestId('power-surge-burst')).toBeNull()
    } finally { vi.useRealTimers() }
  })

  it('does not replay for a surge that was already on when the page loaded', () => {
    render(<EventBurst state={surgeState({})} />)
    expect(screen.queryByTestId('power-surge-burst')).toBeNull()
  })

  it('has no announcement when the rules have no Power Surge', () => {
    expect(describePowerSurge(surgeState(null))).toBeNull()
    expect(describePowerSurge(surgeState({ active: false, used: true }))).toBeNull()
  })
})

describe('duck out', () => {
  const out = (extra: Partial<NonNullable<MatchState['lastBall']>>): MatchState => ({ ...referenceState(), lastBall: { ballId: `d-${JSON.stringify(extra)}`, label: 'W', kind: 'Wicket', runs: 0, ...extra } })

  it('words a plain, a golden and a diamond duck', () => {
    expect(describeBurst(out({ duckType: 'Duck', duckName: 'Axar Patel' }))).toMatchObject({ duck: 'Duck', title: 'DUCK!', tag: 'OUT FOR NOUGHT', who: 'Axar Patel' })
    expect(describeBurst(out({ duckType: 'Golden' }))).toMatchObject({ duck: 'Golden', title: 'GOLDEN DUCK!', tag: 'OUT FIRST BALL' })
    expect(describeBurst(out({ duckType: 'Diamond' }))).toMatchObject({ duck: 'Diamond', title: 'DIAMOND DUCK!' })
  })

  it('a wicket with runs is the normal OUT, and a hat-trick keeps its own graphic', () => {
    expect(describeBurst(out({}))).toMatchObject({ title: 'OUT!' })
    expect(describeBurst(out({}))?.duck).toBeUndefined()
    const both = describeBurst(out({ duckType: 'Duck', wicketStreak: 3 }))
    expect(both?.hatTrick).toBe(true)
    expect(both?.duck).toBeUndefined()
  })

  it('draws the duck, the word and the batter on screen', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<EventBurst state={{ ...referenceState(), lastBall: null }} />)
      rerender(<EventBurst state={out({ duckType: 'Golden', duckName: 'Mehidy Hasan' })} />)
      expect(screen.getByTestId('duck-run')).toBeInTheDocument()
      const text = screen.getByTestId('duck-out')
      expect(text).toHaveAttribute('data-duck', 'Golden')
      expect(text.textContent).toContain('GOLDEN DUCK!')
      expect(text.textContent).toContain('Mehidy Hasan')
    } finally { vi.useRealTimers() }
  })
})
