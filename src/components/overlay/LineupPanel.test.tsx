import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BroadcastOverlay } from './BroadcastOverlay'
import { LineupPanel } from './LineupPanel'
import { indiaXI, lineupOf, lineupState, referenceState, withGraphics } from './fixtures'
import { BOTH_GAP, cardName, cardWidth, cardWidthBoth, fitFont, roleSuffix, rowSizes, selectedLineup, selectedLineups } from './lineup'
import type { LineupPlayer, MatchState } from '../../lib/types'

const player = (over: Partial<LineupPlayer>): LineupPlayer =>
  ({ playerId: 'x', firstName: '', lastName: '', displayName: '', photoUrl: null, isCaptain: false, isWicketKeeper: false, battingOrder: 1, ...over })

describe('lineup helpers', () => {
  it('lays an XI out as 4 / 4 / 3, like the reference picture', () => {
    expect(rowSizes(11)).toEqual([4, 4, 3])
    expect(rowSizes(12)).toEqual([4, 4, 4])
    expect(rowSizes(9)).toEqual([3, 3, 3])
    expect(rowSizes(10)).toEqual([4, 3, 3])
    expect(rowSizes(4)).toEqual([4])
    expect(rowSizes(5)).toEqual([3, 2])
    expect(rowSizes(1)).toEqual([1])
    expect(rowSizes(0)).toEqual([])
  })

  it('writes the role after the surname', () => {
    expect(roleSuffix(player({ isWicketKeeper: true }))).toBe('(WK)')
    expect(roleSuffix(player({ isCaptain: true }))).toBe('(C)')
    expect(roleSuffix(player({ isCaptain: true, isWicketKeeper: true }))).toBe('(C & WK)')
    expect(roleSuffix(player({}))).toBe('')
  })

  it('puts the first name small over a big surname', () => {
    expect(cardName(player({ firstName: 'Ishan', lastName: 'Kishan', isWicketKeeper: true }))).toEqual({ first: 'Ishan', last: 'Kishan(WK)' })
    expect(cardName(player({ firstName: 'Pat', lastName: '' }))).toEqual({ first: '', last: 'Pat' })       // one name goes in the big line
    expect(cardName(player({ displayName: 'Marnus Labuschagne' }))).toEqual({ first: 'Marnus', last: 'Labuschagne' })
    expect(cardName(player({ displayName: 'Rohit' }))).toEqual({ first: '', last: 'Rohit' })
  })

  it('makes every grid fit the 1080px canvas, with bigger cards when there are fewer rows', () => {
    for (const rows of [1, 2, 3, 4]) {
      const w = cardWidth(rows)
      expect(rows * w * 1.46 + (rows - 1) * 22).toBeLessThanOrEqual(900)
    }
    expect(cardWidth(1)).toBeGreaterThan(cardWidth(2))
    expect(cardWidth(2)).toBeGreaterThan(cardWidth(3))
  })

  it('shrinks long surnames so they stay inside the card', () => {
    expect(fitFont('SHARMA', 180, 37)).toBe(37)
    expect(fitFont('CHAKRAVARTHY', 180, 37)).toBeLessThan(37)
    expect(fitFont('CHAKRAVARTHY', 180, 37) * 12 * 0.52).toBeLessThanOrEqual(180)
  })
})

describe('selectedLineup', () => {
  it('is the team the producer chose, only while the graphic is on', () => {
    expect(selectedLineup(lineupState())?.team.id).toBe('ind')
    expect(selectedLineup(withGraphics(lineupState(), { TeamLineup: false }))).toBeNull()
    expect(selectedLineup(referenceState())).toBeNull()
  })
  it('ignores an unknown team or an empty XI', () => {
    const s = lineupState()
    expect(selectedLineup({ ...s, graphics: { ...s.graphics, TeamLineup: { isVisible: true, payload: { teamId: 'nobody' } } } })).toBeNull()
    expect(selectedLineup({ ...s, lineups: { ...s.lineups, home: lineupOf(s.lineups.home.team, []) } })).toBeNull()
  })
  it('does not break on an older server that sends no lineups', () => {
    const s = lineupState()
    expect(selectedLineup({ ...s, lineups: undefined as never })).toBeNull()
  })
})

describe('LineupPanel', () => {
  it('shows the team and eleven cards in batting order', () => {
    render(<LineupPanel state={lineupState()} />)
    expect(screen.getByText('India')).toBeInTheDocument()
    expect(screen.getByText('PLAYING XI')).toBeInTheDocument()
    const cards = screen.getAllByTestId('lineup-card')
    expect(cards).toHaveLength(11)
    expect(cards.map((c) => c.getAttribute('data-order'))).toEqual(Array.from({ length: 11 }, (_, i) => String(i + 1)))
  })

  it('writes the names like the reference: first name over SURNAME with (WK) and (C)', () => {
    render(<LineupPanel state={lineupState()} />)
    expect(screen.getByText('Abhishek')).toBeInTheDocument()
    expect(screen.getByText('Sharma')).toBeInTheDocument()
    expect(screen.getByText('Kishan(WK)')).toBeInTheDocument()
    expect(screen.getByText('Yadav(C)')).toBeInTheDocument()
    expect(screen.getByText('Chakravarthy')).toBeInTheDocument()
  })

  it('arranges the cards in rows of 4, 4 and 3', () => {
    render(<LineupPanel state={lineupState()} />)
    const panel = screen.getByTestId('lineup-panel')
    const rows = Array.from(panel.querySelectorAll('[data-testid="lineup-card"]')).map((c) => c.parentElement!)
    const perRow = [...new Set(rows)].map((r) => within(r).getAllByTestId('lineup-card').length)
    expect(perRow).toEqual([4, 4, 3])
  })

  it('rolls the cards out one after another (each starts later than the one before)', () => {
    render(<LineupPanel state={lineupState()} />)
    const delays = screen.getAllByTestId('lineup-card').map((c) => parseInt((c as HTMLElement).style.animationDelay, 10))
    expect(delays[0]).toBeGreaterThan(0)
    for (let i = 1; i < delays.length; i++) expect(delays[i]!).toBeGreaterThan(delays[i - 1]!)
    expect(delays[10]! - delays[0]!).toBe(1700)
  })

  it('uses the team colour for the card backgrounds and initials when there is no photo', () => {
    render(<LineupPanel state={lineupState()} />)
    expect(screen.getAllByText('AS').length).toBeGreaterThan(0)         // Abhishek Sharma
    expect(screen.getByTestId('lineup-panel').innerHTML).toContain('rgb(29, 78, 216)')   // India blue (#1d4ed8) as the browser writes it
  })

  it('renders nothing when no team is on air', () => {
    const { container } = render(<LineupPanel state={referenceState()} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('in the broadcast overlay', () => {
  it('shows before the match has started (no innings yet)', () => {
    render(<BroadcastOverlay state={lineupState({ status: 'Scheduled' })} />)
    expect(screen.getByTestId('lineup-panel')).toBeInTheDocument()
    expect(screen.getAllByTestId('lineup-card')).toHaveLength(11)
  })

  it('also works during play, over the scorebug', () => {
    const s = referenceState()
    render(<BroadcastOverlay state={{ ...s, lineups: lineupState().lineups, graphics: { ...s.graphics, TeamLineup: { isVisible: true, payload: { teamId: 'ind' } } } }} />)
    expect(screen.getByTestId('lineup-panel')).toBeInTheDocument()
    expect(screen.getByTestId('scorebug')).toBeInTheDocument()
  })

  it('is not drawn while the graphic is off', () => {
    render(<BroadcastOverlay state={withGraphics(lineupState(), { TeamLineup: false })} />)
    expect(screen.queryByTestId('lineup-panel')).toBeNull()
  })

  it('switches to the other team when the producer picks it', () => {
    const s = lineupState()
    const { rerender } = render(<BroadcastOverlay state={s} />)
    expect(screen.getByTestId('lineup-panel')).toHaveAttribute('data-team', 'ind')
    rerender(<BroadcastOverlay state={{ ...s, graphics: { ...s.graphics, TeamLineup: { isVisible: true, payload: { teamId: s.awayTeam.id } } } }} />)
    expect(screen.getByTestId('lineup-panel')).toHaveAttribute('data-team', s.awayTeam.id)
    expect(screen.getAllByTestId('lineup-card')).toHaveLength(1)
  })
})

describe('fixture sanity', () => {
  it('the India XI matches the reference picture', () => {
    expect(indiaXI().map((p) => p.lastName)).toEqual(['Sharma', 'Kishan', 'Varma', 'Yadav', 'Pandya', 'Dube', 'Singh', 'Patel', 'Singh', 'Bumrah', 'Chakravarthy'])
  })
})

// ---- both teams side by side ----
const both = (): MatchState => {
  const s = lineupState()
  const awayXI = indiaXI().map((p) => ({ ...p, playerId: `a-${p.playerId}`, firstName: `A${p.firstName}`, lastName: `Z${p.lastName}` }))
  return { ...s, lineups: { home: s.lineups.home, away: lineupOf(s.awayTeam, awayXI) }, graphics: { ...s.graphics, TeamLineup: { isVisible: true, payload: { teamId: 'both' } } } }
}

describe('both teams together', () => {
  it('selectedLineups returns one team, both teams, or nothing', () => {
    expect(selectedLineups(lineupState()).map((l) => l.team.id)).toEqual(['ind'])
    expect(selectedLineups(both()).map((l) => l.team.id)).toEqual(['ind', both().awayTeam.id])
    expect(selectedLineups(withGraphics(both(), { TeamLineup: false }))).toEqual([])
    expect(selectedLineups(referenceState())).toEqual([])
  })

  it('"both" with only one team picked falls back to showing that team alone', () => {
    const s = lineupState()                                                  // home: 11 players, away: 1
    const oneEmpty = { ...s, lineups: { ...s.lineups, away: lineupOf(s.awayTeam, []) }, graphics: { ...s.graphics, TeamLineup: { isVisible: true, payload: { teamId: 'both' } } } }
    expect(selectedLineups(oneEmpty)).toHaveLength(1)
    expect(selectedLineup(oneEmpty)?.team.id).toBe('ind')
    expect(selectedLineup(both())).toBeNull()                                // two teams are not "the single team"
  })

  it('cards are smaller than for one team, and two full grids always fit the canvas', () => {
    for (const rows of [1, 2, 3]) {
      const w = cardWidthBoth(rows)
      expect(rows * w * 1.46 + (rows - 1) * BOTH_GAP).toBeLessThanOrEqual(864)       // height under the header
      expect(4 * w + 3 * BOTH_GAP).toBeLessThanOrEqual(880)                          // each side gets half the width
    }
    expect(cardWidthBoth(3)).toBeLessThan(cardWidth(3))
  })

  it('shows 22 cards, 11 per team in two labelled columns', () => {
    render(<LineupPanel state={both()} />)
    expect(screen.getByTestId('lineup-panel')).toHaveAttribute('data-team', 'both')
    expect(screen.getAllByTestId('lineup-card')).toHaveLength(22)
    const columns = screen.getAllByTestId('lineup-column')
    expect(columns).toHaveLength(2)
    expect(within(columns[0]!).getAllByTestId('lineup-card')).toHaveLength(11)
    expect(within(columns[1]!).getAllByTestId('lineup-card')).toHaveLength(11)
    expect(within(columns[0]!).getByText('India')).toBeInTheDocument()                // the team name above its own column
    expect(within(columns[1]!).getByText(both().awayTeam.name)).toBeInTheDocument()
    expect(screen.getByText('PLAYING XI')).toBeInTheDocument()
  })

  it('each column is a 4 / 4 / 3 grid and the cards are the same size on both sides', () => {
    render(<LineupPanel state={both()} />)
    for (const col of screen.getAllByTestId('lineup-column')) {
      const rows = [...new Set(within(col).getAllByTestId('lineup-card').map((c) => c.parentElement!))]
      expect(rows.map((r) => within(r).getAllByTestId('lineup-card').length)).toEqual([4, 4, 3])
    }
    const widths = new Set(screen.getAllByTestId('lineup-card').map((c) => (c as HTMLElement).style.width))
    expect(widths.size).toBe(1)
    expect([...widths][0]).toBe(`${cardWidthBoth(3)}px`)
  })

  it('both teams roll out at once, the away side a fraction later so they do not move in lockstep', () => {
    render(<LineupPanel state={both()} />)
    const [home, away] = screen.getAllByTestId('lineup-column').map((c) => within(c).getAllByTestId('lineup-card').map((k) => Number(k.getAttribute('data-delay'))))
    expect(home![0]).toBe(450)                                                // both start straight away ...
    expect(away![0]).toBeGreaterThan(home![0]!)                               // ... the away side just behind
    expect(away![0]! - home![0]!).toBeLessThan(170)                           // less than one card step: still together
    for (let i = 1; i < 11; i++) { expect(home![i]!).toBeGreaterThan(home![i - 1]!); expect(away![i]!).toBeGreaterThan(away![i - 1]!) }
    expect(Math.max(...away!)).toBeLessThan(3000)                             // the whole thing is on screen within about 2.5 s
  })

  it('works inside the overlay and sits in front of the banner', () => {
    render(<BroadcastOverlay state={both()} />)
    expect(screen.getByTestId('lineup-panel')).toHaveAttribute('data-team', 'both')
    expect(screen.getAllByTestId('lineup-card')).toHaveLength(22)
  })
})