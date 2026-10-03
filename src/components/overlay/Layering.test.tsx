import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BroadcastOverlay } from './BroadcastOverlay'
import { lineupState, referenceState } from './fixtures'
import type { MatchState } from '../../lib/types'

// In the canvas, later siblings are drawn in front of earlier ones.
const inFront = (a: HTMLElement, b: HTMLElement) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING)   // true when a is drawn over b

const banner = (s: MatchState): MatchState => ({ ...s, graphics: { ...s.graphics, Banner: { isVisible: true, payload: { text: 'Happy Independence Day' } } } })

describe('overlay stacking order', () => {
  it('the banner is BEHIND the player introduction cards', () => {
    render(<BroadcastOverlay state={banner(lineupState())} />)
    const lineup = screen.getByTestId('lineup-panel')
    const text = screen.getByText('Happy Independence Day')
    expect(lineup).toBeInTheDocument()
    expect(inFront(lineup, text)).toBe(true)
    expect(inFront(text, lineup)).toBe(false)
  })

  it('the banner still shows in front of the scorebug and cards during normal play', () => {
    const s = banner(referenceState())
    render(<BroadcastOverlay state={s} />)
    expect(inFront(screen.getByText('Happy Independence Day'), screen.getByTestId('scorebug'))).toBe(true)
  })

  it('the player introduction is in front of the scorebug, so the cards are never hidden by it', () => {
    const s = lineupState({ status: 'Live' })
    render(<BroadcastOverlay state={{ ...s, innings: referenceState().innings }} />)
    expect(inFront(screen.getByTestId('lineup-panel'), screen.getByTestId('scorebug'))).toBe(true)
  })
})
