import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TeamSheet } from './TeamSheet'
import type { Squad } from '../lib/types'

const squad: Squad = {
  teamId: 't1',
  players: [
    { playerId: 'a', name: 'Rohit Sharma', photoUrl: null, role: 'Batter', isPlayingXI: true, isCaptain: true, isWicketKeeper: false, battingOrder: 1 },
    { playerId: 'b', name: 'Dhruv Jurel', photoUrl: null, role: 'WicketKeeper', isPlayingXI: false, isCaptain: false, isWicketKeeper: false, battingOrder: 0 },
  ],
  staff: [{ name: 'Gautam Gambhir', role: 'Head coach' }],
}

describe('TeamSheet', () => {
  it('groups players into XI, bench and support staff', () => {
    render(<TeamSheet teamName="India" squad={squad} />)
    const sheet = screen.getByTestId('team-sheet')
    expect(within(sheet).getByText('Playing XI')).toBeInTheDocument()
    expect(within(sheet).getByText('Bench')).toBeInTheDocument()
    expect(within(sheet).getByText('Support staff')).toBeInTheDocument()
    expect(within(sheet).getByText('Gautam Gambhir')).toBeInTheDocument()
    expect(within(sheet).getByText('Head coach')).toBeInTheDocument()
    expect(within(sheet).getByText('C')).toBeInTheDocument()
  })

  it('says so when nothing is named', () => {
    render(<TeamSheet teamName="India" squad={undefined} />)
    expect(screen.getAllByText('None named.')).toHaveLength(3)
  })
})
