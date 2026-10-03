import type { GraphicKey, Lineup, LineupPlayer, MatchState, TeamLite } from '../../lib/types'

const team = (id: string, name: string, shortName: string, primaryColor: string): TeamLite => ({ id, name, shortName, logoUrl: null, primaryColor, secondaryColor: null })

const allGraphics = (visible: Partial<Record<GraphicKey, boolean>> = {}): MatchState['graphics'] => {
  const base: Record<GraphicKey, boolean> = { Scorebug: true, BatterCards: true, BowlerCard: true, Timeline: true, WinProbability: true, FullScorecard: false, Banner: false, TeamLineup: false }
  const keys = Object.keys(base) as GraphicKey[]
  return Object.fromEntries(keys.map((k) => [k, { isVisible: visible[k] ?? base[k], payload: null }])) as MatchState['graphics']
}

const noActions: MatchState['actions'] = {
  canRecordToss: false, canStartMatch: false, canStartInnings: false, awaitingNewBatter: false, awaitingNewBowler: false,
  canScoreBall: true, canUndo: true, inningsOver: false, canDeclare: true, followOnAvailable: false, canComplete: true,
  nextBattingTeamId: null, availableBatters: [], eligibleBowlers: [], battingXI: [], fieldingXI: [],
}

/** The reference screenshot: BANGLADESH 355-7 (114.1) v AUSTRALIA, Day 3 Session 1. Home = AUS so the order reads AUS / DRAW / BAN. */
export function referenceState(overrides: Partial<MatchState> = {}): MatchState {
  const ban = team('ban', 'Bangladesh', 'BAN', '#15803d')
  const aus = team('aus', 'Australia', 'AUS', '#facc15')
  return {
    matchId: 'm1', version: 10, title: 'Bangladesh v Australia', format: 'TEST', isTest: true, status: 'Live',
    resultText: null, resultType: null, tournamentName: 'Test Series', venueName: 'Mirpur', backgroundUrl: null,
    theme: { primaryColor: '#0f6b4f', secondaryColor: '#7a1fa2', accentColor: '#ffd400', logoUrl: null, watermarkUrl: null, watermarkText: null },
    homeTeam: aus, awayTeam: ban, tossText: 'Australia won the toss and chose to bowl', ballsPerOver: 6, oversPerInnings: 0,
    innings: {
      inningsId: 'i2', inningsNumber: 2, status: 'InProgress', isFollowOn: false, battingTeam: ban, bowlingTeam: aus,
      runs: 355, wickets: 7, overs: '114.1', legalBalls: 685, currentRunRate: 3.11, extras: 12,
      target: null, runsRequired: null, ballsRemaining: null, requiredRunRate: null, projectedScore: 0,
      leadText: 'BAN lead by 157 runs', leadRuns: 157, partnership: { runs: 1, balls: 2 }, freeHit: false, powerplay: false, newBallDue: false,
      striker: { playerId: 'p1', name: 'Mehidy Hasan', shortName: 'M Hasan', photoUrl: null, runs: 34, balls: 80, fours: 3, sixes: 0, strikeRate: 42.5, onStrike: true },
      nonStriker: { playerId: 'p2', name: 'Taijul Islam', shortName: 'T Islam', photoUrl: null, runs: 1, balls: 2, fours: 0, sixes: 0, strikeRate: 50, onStrike: false },
      bowler: { playerId: 'p3', name: 'Pat Cummins', shortName: 'P Cummins', photoUrl: null, overs: '22.1', maidens: 5, runs: 52, wickets: 1, economy: 2.35 },
    },
    previousInnings: [{ inningsNumber: 1, teamShortName: 'AUS', runs: 198, wickets: 10, overs: '70.2', isDeclared: false, text: '1st Inng.: 198-10' }],
    scorecard: [],
    lastBall: { ballId: 'b100', label: '0', kind: 'Dot', runs: 0 },
    timeline: [
      { overNumber: 114, bowlerName: 'Pat Cummins', runs: 1, wickets: 1, legalBalls: 6, isCompleted: true,
        balls: [{ label: '0', kind: 'Dot' }, { label: '0', kind: 'Dot' }, { label: '0', kind: 'Dot' }, { label: '0', kind: 'Dot' }, { label: 'W', kind: 'Wicket' }, { label: '1', kind: 'Runs' }] },
      { overNumber: 115, bowlerName: 'Mitchell Starc', runs: 0, wickets: 0, legalBalls: 1, isCompleted: false, balls: [{ label: '0', kind: 'Dot' }] },
    ],
    testClock: { day: 3, session: 1, oversLeftToday: '85.5', oversLostToday: 0 },
    winProbability: { home: 41, draw: 7, away: 52 },
    lineups: { home: lineupOf(aus, []), away: lineupOf(ban, []) },
    graphics: allGraphics(), actions: noActions, ...overrides,
  }
}

/** A T20 chase: target, required rate, free hit, powerplay. */
export function limitedOversState(overrides: Partial<MatchState> = {}): MatchState {
  const base = referenceState()
  const inn = base.innings!
  return {
    ...base, format: 'T20', isTest: false, oversPerInnings: 20, testClock: null, winProbability: { home: 0, draw: 0, away: 0 },
    previousInnings: [{ inningsNumber: 1, teamShortName: 'AUS', runs: 180, wickets: 6, overs: '20.0', isDeclared: false, text: '1st Inng.: 180-6' }],
    innings: { ...inn, runs: 40, wickets: 1, overs: '5.0', currentRunRate: 8, target: 181, runsRequired: 141, ballsRemaining: 90,
      requiredRunRate: 9.4, leadText: 'BAN need 141 runs in 90 balls', leadRuns: null, freeHit: true, powerplay: true },
    ...overrides,
  }
}

export function withGraphics(state: MatchState, visible: Partial<Record<GraphicKey, boolean>>): MatchState {
  return { ...state, graphics: allGraphics(visible) }
}

export function lineupOf(team: TeamLite, players: LineupPlayer[]): Lineup { return { team, players } }

const p = (n: number, first: string, last: string, extra: Partial<LineupPlayer> = {}): LineupPlayer =>
  ({ playerId: `ip${n}`, firstName: first, lastName: last, displayName: `${first} ${last}`.trim(), photoUrl: null, isCaptain: false, isWicketKeeper: false, battingOrder: n, ...extra })

/** The playing XI from the reference picture (India T20 side). */
export function indiaXI(): LineupPlayer[] {
  return [
    p(1, 'Abhishek', 'Sharma'), p(2, 'Ishan', 'Kishan', { isWicketKeeper: true }), p(3, 'Tilak', 'Varma'),
    p(4, 'Suryakumar', 'Yadav', { isCaptain: true }), p(5, 'Hardik', 'Pandya'), p(6, 'Shivam', 'Dube'),
    p(7, 'Rinku', 'Singh'), p(8, 'Axar', 'Patel'), p(9, 'Arshdeep', 'Singh'), p(10, 'Jasprit', 'Bumrah'), p(11, 'Varun', 'Chakravarthy'),
  ]
}

/** Before the match: India's XI is on air (TeamLineup visible, payload.teamId = 'ind'). */
export function lineupState(overrides: Partial<MatchState> = {}): MatchState {
  const base = referenceState()
  const ind = team('ind', 'India', 'IND', '#1d4ed8')
  return {
    ...base, status: 'TossCompleted', innings: null, lastBall: null, timeline: [], testClock: null,
    homeTeam: ind, awayTeam: base.awayTeam,
    lineups: { home: lineupOf(ind, indiaXI()), away: lineupOf(base.awayTeam, [p(21, 'Travis', 'Head')]) },
    graphics: { ...allGraphics(), TeamLineup: { isVisible: true, payload: { teamId: 'ind' } } },
    ...overrides,
  }
}