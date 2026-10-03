import type { BatterLine, InningsScorecard, MatchState, TeamLite } from '../lib/types'
import { referenceState } from './overlay/fixtures'

const team = (id: string, name: string, shortName: string): TeamLite => ({ id, name, shortName, logoUrl: null, primaryColor: null, secondaryColor: null })

const bat = (n: number, name: string, runs: number, balls: number, fours: number, sixes: number, strikeRate: number, status: string, dismissalText: string, role: Partial<BatterLine> = {}): BatterLine =>
  ({ playerId: `b${n}`, name, isCaptain: false, isWicketKeeper: false, runs, balls, fours, sixes, strikeRate, status, dismissalText, ...role })

// The reference scorecard: West Indies 272-4 (40.2 Ov) chasing India, 80 needed from 58.
export function westIndiesState(): MatchState {
  const wi = team('wi', 'West Indies', 'WI')
  const ind = team('ind', 'India', 'IND')
  const second: InningsScorecard = {
    inningsNumber: 2, battingTeam: wi, runs: 272, wickets: 4, overs: '40.2', extras: 15, runRate: 6.74, extrasText: '(b 0, lb 8, w 6, nb 1, p 0)', isCompleted: false,
    batting: [
      bat(1, 'John Campbell', 10, 7, 2, 0, 142.86, 'out', 'b Mohammed Siraj'),
      bat(2, 'Shai Hope', 111, 119, 10, 1, 93.28, 'batting', '', { isCaptain: true, isWicketKeeper: true }),
      bat(3, 'Amir Jangoo', 67, 56, 5, 1, 119.64, 'out', 'run out (Virat Kohli/Naman Dhir)'),
      bat(4, 'Sherfane Rutherford', 24, 25, 2, 0, 96, 'out', 'c KL Rahul b Naman Dhir'),
      bat(5, 'Keemo Paul', 44, 35, 5, 0, 125.71, 'out', 'c Nitish Reddy b Gurnoor Brar'),
      bat(6, 'Matthew Forde', 1, 1, 0, 0, 100, 'batting', ''),
    ],
    bowling: [{ playerId: 'w1', name: 'Mohammed Siraj', overs: '8.0', maidens: 0, runs: 52, wickets: 1, wides: 2, noBalls: 0, economy: 6.5 }],
    fallOfWickets: [{ wicketNumber: 1, score: 17, overs: '1.5', batterName: 'John Campbell' }, { wicketNumber: 2, score: 120, overs: '21.0', batterName: 'Amir Jangoo' }],
    yetToBat: ['Jewel Andrew', 'Alzarri Joseph', 'Gudakesh Motie', 'Jayden Seales', 'Vitel Lawes'],
  }
  const first: InningsScorecard = {
    inningsNumber: 1, battingTeam: ind, runs: 350, wickets: 8, overs: '50.0', extras: 10, runRate: 7, extrasText: '(w 10)', isCompleted: true,
    batting: [bat(11, 'Rohit Sharma', 80, 70, 8, 3, 114.28, 'out', 'c Hope b Joseph', { isCaptain: true })],
    bowling: [{ playerId: 'w2', name: 'Alzarri Joseph', overs: '10.0', maidens: 1, runs: 60, wickets: 3, wides: 4, noBalls: 1, economy: 6 }],
    fallOfWickets: [], yetToBat: [],
  }
  return referenceState({
    isTest: false, format: 'ODI', status: 'Live', resultText: null,
    scorecard: [first, second],
    innings: { ...referenceState().innings!, inningsNumber: 2, battingTeam: wi, bowlingTeam: ind, status: 'InProgress', leadText: 'West Indies need 80 runs in 58 balls' },
  })
}
