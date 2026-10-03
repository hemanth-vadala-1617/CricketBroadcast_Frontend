import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BroadcastOverlay } from './BroadcastOverlay'
import { lineupState, referenceState } from './fixtures'
import type { MatchState } from '../../lib/types'

// referenceState: BAN bats (#15803d green), AUS bowls (#facc15 gold), theme primary #0f6b4f
const BAN_GREEN = 'rgb(21, 128, 61)'
const AUS_GOLD = 'rgb(250, 204, 21)'

const withTheme = (s: MatchState, theme: Partial<MatchState['theme']>): MatchState => ({ ...s, theme: { ...s.theme, ...theme } })
const bars = () => screen.getByTestId('scorebug').innerHTML
// The two score bars are the gradients: left runs 90deg, right runs 270deg. (The small team-logo circles keep their team colour either way.)
const leftBar = (rgb: string) => new RegExp(`linear-gradient\\(90deg, ${rgb.replace(/[()]/g, '\\$&')}`)
const rightBar = (rgb: string) => new RegExp(`linear-gradient\\(270deg[^;]*${rgb.replace(/[()]/g, '\\$&')}\\);`)

describe('score bar colours follow the theme', () => {
  it('uses the theme primary colour on both bars by default, ignoring the team colours', () => {
    render(<BroadcastOverlay state={withTheme(referenceState(), { primaryColor: '#0f6b6b' })} />)
    expect(bars()).toMatch(leftBar('rgb(15, 107, 107)'))
    expect(bars()).toMatch(rightBar('rgb(15, 107, 107)'))
    expect(bars()).not.toMatch(leftBar(BAN_GREEN))
    expect(bars()).not.toMatch(rightBar(AUS_GOLD))
  })

  it('changing the primary colour changes the bars (the reported bug)', () => {
    const { rerender } = render(<BroadcastOverlay state={withTheme(referenceState(), { primaryColor: '#0f6b4f' })} />)
    expect(bars()).toMatch(leftBar('rgb(15, 107, 79)'))
    rerender(<BroadcastOverlay state={{ ...withTheme(referenceState(), { primaryColor: '#112233' }), version: 11 }} />)
    expect(bars()).toMatch(leftBar('rgb(17, 34, 51)'))
    expect(bars()).toMatch(rightBar('rgb(17, 34, 51)'))
    expect(bars()).not.toMatch(leftBar('rgb(15, 107, 79)'))
  })

  it('wears each team\'s own colour only when the theme asks for it', () => {
    render(<BroadcastOverlay state={withTheme(referenceState(), { useTeamColors: true })} />)
    expect(bars()).toMatch(leftBar(BAN_GREEN))
    expect(bars()).toMatch(rightBar(AUS_GOLD))
  })

  it('falls back to the theme colour for a team that has none', () => {
    const s = withTheme(referenceState(), { useTeamColors: true, primaryColor: '#0f6b4f' })
    const noColour: MatchState = { ...s, innings: { ...s.innings!, battingTeam: { ...s.innings!.battingTeam, primaryColor: null } } }
    render(<BroadcastOverlay state={noColour} />)
    expect(bars()).toMatch(leftBar('rgb(15, 107, 79)'))
    expect(bars()).toMatch(rightBar(AUS_GOLD))                        // the bowling team still has a colour
  })

  it('the player-intro cards follow the same rule', () => {
    const on = lineupState()                                          // fixture: useTeamColors true, India blue
    const { unmount } = render(<BroadcastOverlay state={on} />)
    expect(screen.getAllByTestId('lineup-card')[0]!.innerHTML).toContain('rgb(29, 78, 216)')
    unmount()
    render(<BroadcastOverlay state={withTheme(on, { useTeamColors: false, primaryColor: '#0f6b4f' })} />)
    expect(screen.getAllByTestId('lineup-card')[0]!.innerHTML).not.toContain('rgb(29, 78, 216)')
    expect(screen.getAllByTestId('lineup-card')[0]!.innerHTML).toContain('rgb(15, 107, 79)')
  })
})
