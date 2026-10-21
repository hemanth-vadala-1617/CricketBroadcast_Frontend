import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Player } from '../../lib/types'

const get = vi.fn()
vi.mock('../../lib/api', async (orig) => ({ ...(await orig<typeof import('../../lib/api')>()), api: { get: (...a: unknown[]) => get(...a) } }))

import TeamPlayersList from './TeamPlayersList'

const player = (id: string, name: string, over: Partial<Player> = {}): Player => ({
  id, currentTeamId: 't1', currentTeamName: 'India', firstName: '', lastName: '', displayName: name, shortName: name, photoUrl: null,
  jerseyNumber: 0, battingStyle: '', bowlingStyle: '', playerRole: 'Batter', isActive: true,
  careerLabel: '', careerMatches: null, careerRuns: null, careerAverage: null, careerStrikeRate: null, careerFifties: null, careerHundreds: null, ...over,
})

const show = (onOpen = vi.fn()) => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><TeamPlayersList teamId="t1" onOpen={onOpen} /></QueryClientProvider>)

beforeEach(() => get.mockReset())

describe('TeamPlayersList', () => {
  it("asks for only that team's players, lists them with role and shirt number, and opens one on a tap", async () => {
    get.mockResolvedValue([player('p1', 'Virat Kohli', { jerseyNumber: 18, battingStyle: 'Right-hand bat' }), player('p2', 'Jasprit Bumrah', { playerRole: 'Bowler' })])
    const onOpen = vi.fn()
    show(onOpen)
    expect(await screen.findByText('Virat Kohli')).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith(expect.stringContaining('teamId=t1'))
    expect(screen.getByText('Players (2)')).toBeInTheDocument()
    expect(screen.getByText('#18')).toBeInTheDocument()
    expect(screen.getByText('Batter · Right-hand bat')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Jasprit Bumrah/ }))
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'p2' }))
  })

  it('says so when the team has no players', async () => {
    get.mockResolvedValue([])
    show()
    expect(await screen.findByText(/No players in this team yet/)).toBeInTheDocument()
  })
})
