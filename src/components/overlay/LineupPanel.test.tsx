import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BroadcastOverlay } from './BroadcastOverlay'
import { LineupPanel } from './LineupPanel'
import { indiaXI, lineupOf, lineupState, referenceState, withGraphics } from './fixtures'
import { cardName, cardWidth, fitFont, roleSuffix, rowSizes, selectedLineup } from './lineup'
import type { LineupPlayer } from '../../lib/types'

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
