import type { ReactNode } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { keys } from '../../hooks/queries'
import type { MatchRules, MatchSummary, OverlayTheme, Player, Tournament } from '../../lib/types'
import PlayerViewModal from './PlayerViewModal'
import TournamentViewModal from './TournamentViewModal'

const tournament: Tournament = {
  id: 't1', name: 'Sample Series', shortName: 'SAMPLE', season: '2026', format: 'T20', startDate: '2026-10-02T00:00:00+00:00', endDate: '2026-11-01T00:00:00+00:00',
  logoUrl: null, status: 'Live', description: 'The opening series.', defaultMatchRulesId: 'r1', overlayThemeId: 'th1',
}
const rules: MatchRules = {
  id: 'r1', name: 'T20', isTest: false, ballsPerOver: 6, oversPerInnings: 20, maxOversPerBowler: 4, powerplayOvers: 6, wideRuns: 1, noBallRuns: 1, freeHitEnabled: true,
  followOnEnabled: false, inningsPerSide: 1, days: 1, oversPerDay: 0, sessionsPerDay: 1, newBallAfterOvers: 0, followOnMargin: 200,
}
const theme: OverlayTheme = { id: 'th1', name: 'Broadcast Green', primaryColor: '#0f6b4f', secondaryColor: '#7a1fa2', accentColor: '#ffd400', backgroundUrl: null, logoUrl: null, watermarkUrl: null, watermarkText: 'LIVE', useTeamColors: false }
const match = (id: string, status: MatchSummary['status'], home: string, away: string): MatchSummary => ({
  id, title: `${home} vs ${away}`, tournamentId: 't1', tournamentName: 'Sample Series', homeTeamId: 'a', awayTeamId: 'b', homeTeamName: home, awayTeamName: away,
  homeShortName: home.slice(0, 3).toUpperCase(), awayShortName: away.slice(0, 3).toUpperCase(), venueId: 'v', venueName: 'Sample Stadium', matchRulesId: 'r1', overlayThemeId: null,
  matchFormat: 'T20', status, scheduledStart: '2026-10-04T14:00:00Z', tossWinnerTeamId: null, tossDecision: null, resultText: status === 'Completed' ? 'India won by 10 wickets' : null, squadSize: 22,
})

function withData(ui: ReactNode, matches: MatchSummary[] = []) {
  // data is seeded and never goes stale, so no request is sent from the test
  const qc = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } })
  qc.setQueryData([...keys.rules], [rules])
  qc.setQueryData([...keys.themes], [theme])
  qc.setQueryData([...keys.matches, { tournamentId: 't1' }], matches)
  return render(<QueryClientProvider client={qc}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>)
}

describe('TournamentViewModal', () => {
  it('shows the tournament details, rules, theme and the matches with counts and teams', () => {
    withData(
      <TournamentViewModal tournament={tournament} isAdmin onClose={() => undefined} onEdit={() => undefined} />,
      [match('m1', 'Live', 'India', 'Australia'), match('m2', 'Completed', 'India', 'England'), match('m3', 'Scheduled', 'Australia', 'England')],
    )
    const dialog = screen.getByRole('dialog', { name: 'Sample Series' })
    expect(within(dialog).getByText('SAMPLE · 2026')).toBeInTheDocument()
    expect(within(dialog).getAllByText('T20').length).toBeGreaterThan(0)                                       // format badge (and the rules name)
    expect(within(dialog).getByText(/2 Oct 2026/)).toBeInTheDocument()
    expect(within(dialog).getByText(/1 Nov 2026/)).toBeInTheDocument()
    expect(within(dialog).getByText('(31 days)')).toBeInTheDocument()
    expect(within(dialog).getByText('The opening series.')).toBeInTheDocument()
    expect(within(dialog).getByText('20 overs a side · max 4 per bowler · powerplay 6 overs · free hit')).toBeInTheDocument()
    expect(within(dialog).getByText('Broadcast Green')).toBeInTheDocument()
    expect(within(dialog).getByText('#7a1fa2', { exact: false })).toBeInTheDocument()
    expect(within(dialog).getAllByText('LIVE').length).toBeGreaterThanOrEqual(2)                                // watermark text + the live match badge

    const stats = within(dialog).getByLabelText('Matches in this tournament')
    // the number sits just above its label; some labels (Live, Completed) also appear as status badges below
    const stat = (label: string) => within(stats).getAllByText(label).find((el) => el.previousElementSibling?.classList.contains('font-display'))!.previousElementSibling
    expect(stat('Matches')).toHaveTextContent('3')
    expect(stat('Live')).toHaveTextContent('1')
    expect(stat('Completed')).toHaveTextContent('1')
    expect(stat('Upcoming')).toHaveTextContent('1')
    for (const team of ['Australia', 'England', 'India']) expect(within(stats).getAllByText(team).length).toBeGreaterThan(0)
    expect(within(stats).getByText('India won by 10 wickets')).toBeInTheDocument()
    expect(within(dialog).getAllByRole('link', { name: 'Scorecard' })).toHaveLength(3)
    expect(within(dialog).getAllByRole('link', { name: 'Scorecard' })[0]).toHaveAttribute('href', '/admin/matches/m1/scorecard')
  })

  it('says so when there are no matches, rules or theme', () => {
    withData(<TournamentViewModal tournament={{ ...tournament, defaultMatchRulesId: null, overlayThemeId: null, description: null }} isAdmin={false} onClose={() => undefined} onEdit={() => undefined} />)
    expect(screen.getByText('No matches scheduled in this tournament yet.')).toBeInTheDocument()
    expect(screen.getByText('No description')).toBeInTheDocument()
    expect(screen.getByText(/Pick the rules for each match/)).toBeInTheDocument()
  })

  it('offers Edit only to admins, and Edit closes the view first', async () => {
    const onEdit = vi.fn()
    const { unmount } = withData(<TournamentViewModal tournament={tournament} isAdmin onClose={() => undefined} onEdit={onEdit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
    unmount()
    withData(<TournamentViewModal tournament={tournament} isAdmin={false} onClose={() => undefined} onEdit={onEdit} />)
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
  })

  it('Close calls onClose', async () => {
    const onClose = vi.fn()
    withData(<TournamentViewModal tournament={tournament} isAdmin onClose={onClose} onEdit={() => undefined} />)
    const closers = screen.getAllByRole('button', { name: 'Close' })           // the X in the header and the footer button
    expect(closers).toHaveLength(2)
    await userEvent.click(closers[1]!)
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(closers[0]!)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

const player: Player = {
  id: 'p1', currentTeamId: 'a', currentTeamName: 'India', firstName: 'Hardik', lastName: 'Pandya', displayName: 'H Pandya', shortName: 'H Pandya', photoUrl: null,
  jerseyNumber: 33, battingStyle: 'Right-hand bat', bowlingStyle: 'Right-arm fast-medium', playerRole: 'AllRounder', isActive: true,
  careerLabel: '', careerMatches: null, careerRuns: null, careerAverage: null, careerStrikeRate: null, careerFifties: null, careerHundreds: null,
}

describe('PlayerViewModal', () => {
  it('shows everything stored about the player', () => {
    render(<PlayerViewModal player={player} isAdmin onClose={() => undefined} onEdit={() => undefined} />)
    const dialog = screen.getByRole('dialog', { name: 'H Pandya' })
    expect(within(dialog).getByText('Hardik Pandya')).toBeInTheDocument()            // full name from first + last
    expect(within(dialog).queryByText('Display name')).toBeNull()                    // not repeated: the title already shows it
    expect(within(dialog).getAllByText('India').length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText('All-rounder').length).toBeGreaterThan(0)
    expect(within(dialog).getByText('#33')).toBeInTheDocument()
    expect(within(dialog).getByText('Right-hand bat')).toBeInTheDocument()
    expect(within(dialog).getByText('Right-arm fast-medium')).toBeInTheDocument()
    expect(within(dialog).getAllByText('Active').length).toBeGreaterThan(0)
    expect(within(dialog).getByLabelText('No photo')).toHaveTextContent('HP')        // initials when there is no photo
  })

  it('shows dashes for missing details and marks an inactive player', () => {
    render(<PlayerViewModal player={{ ...player, currentTeamId: null, currentTeamName: null, battingStyle: '', bowlingStyle: '', jerseyNumber: 0, isActive: false }} isAdmin={false} onClose={() => undefined} onEdit={() => undefined} />)
    expect(screen.getByText('No team')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
    expect(screen.getAllByText('Inactive').length).toBeGreaterThan(0)
    expect(screen.queryByText(/^#/)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()                // not an admin
  })

  it('uses the photo when there is one', () => {
    render(<PlayerViewModal player={{ ...player, photoUrl: 'https://example.com/h.png' }} isAdmin onClose={() => undefined} onEdit={() => undefined} />)
    expect(screen.getByAltText('Photo of H Pandya')).toHaveAttribute('src', 'https://example.com/h.png')
  })

  it('Edit hands over to the edit dialog', async () => {
    const onEdit = vi.fn()
    render(<PlayerViewModal player={player} isAdmin onClose={() => undefined} onEdit={onEdit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})
