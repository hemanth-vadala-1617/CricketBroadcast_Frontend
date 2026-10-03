// Mirrors CricketStream.Contracts (camelCase JSON). The server owns all cricket maths; the UI renders these verbatim.

export type Role = 'SuperAdmin' | 'Admin' | 'Scorer' | 'Producer' | 'Viewer'

export interface AuthUser { userId: string; email: string; roles: Role[] }
export interface AuthResponse { token: string; refreshToken: string; userId: string; email: string; roles: Role[] }

export interface TeamLite { id: string; name: string; shortName: string; logoUrl: string | null; primaryColor: string | null; secondaryColor: string | null }
export interface Team extends TeamLite { country: string; isActive: boolean; playerCount: number }
export interface TeamInput { name: string; shortName: string; country: string; logoUrl: string | null; primaryColor: string | null; secondaryColor: string | null }

export type PlayerRole = 'Batter' | 'Bowler' | 'AllRounder' | 'WicketKeeper'
export interface Player {
  id: string; currentTeamId: string | null; currentTeamName: string | null
  firstName: string; lastName: string; displayName: string; shortName: string; photoUrl: string | null
  jerseyNumber: number; battingStyle: string; bowlingStyle: string; playerRole: PlayerRole; isActive: boolean
  careerLabel: string; careerMatches: number | null; careerRuns: number | null; careerAverage: number | null
  careerStrikeRate: number | null; careerFifties: number | null; careerHundreds: number | null
}
export type PlayerInput = Omit<Player, 'id' | 'currentTeamName'>

export interface Venue { id: string; name: string; city: string; state: string; country: string; capacity: number; timezone: string; logoUrl: string | null; groundImageUrl: string | null }
export type VenueInput = Omit<Venue, 'id'>

export type MatchFormat = 'T20' | 'ODI' | 'TEST' | 'CUSTOM'
export interface Tournament {
  id: string; name: string; shortName: string; season: string; format: MatchFormat
  startDate: string; endDate: string; logoUrl: string | null; status: string; description: string | null
  defaultMatchRulesId: string | null; overlayThemeId: string | null
}
export type TournamentInput = Omit<Tournament, 'id'>

export interface MatchRules {
  id: string; name: string; isTest: boolean; ballsPerOver: number; oversPerInnings: number; maxOversPerBowler: number
  powerplayOvers: number; wideRuns: number; noBallRuns: number; freeHitEnabled: boolean; followOnEnabled: boolean
  inningsPerSide: number; days: number; oversPerDay: number; sessionsPerDay: number; newBallAfterOvers: number; followOnMargin: number
}
export type MatchRulesInput = Omit<MatchRules, 'id'>

export interface OverlayTheme {
  id: string; name: string; primaryColor: string; secondaryColor: string; accentColor: string
  backgroundUrl: string | null; logoUrl: string | null; watermarkUrl: string | null; watermarkText: string | null; useTeamColors: boolean
}
export type OverlayThemeInput = Omit<OverlayTheme, 'id'>

export type MatchStatus = 'Scheduled' | 'TossCompleted' | 'Live' | 'InningsBreak' | 'RainDelay' | 'Paused' | 'Completed' | 'Abandoned' | 'Cancelled'

export interface MatchSummary {
  id: string; title: string; tournamentId: string; tournamentName: string
  homeTeamId: string; awayTeamId: string; homeTeamName: string; awayTeamName: string; homeShortName: string; awayShortName: string
  venueId: string; venueName: string; matchRulesId: string; overlayThemeId: string | null
  matchFormat: MatchFormat; status: MatchStatus; scheduledStart: string | null
  tossWinnerTeamId: string | null; tossDecision: 'Bat' | 'Bowl' | null; resultText: string | null; squadSize: number
}
export interface CreateMatchInput {
  tournamentId: string; homeTeamId: string; awayTeamId: string; venueId: string; matchRulesId: string
  overlayThemeId: string | null; title: string | null; matchFormat: MatchFormat; scheduledStart: string | null
}

export interface SquadMember { playerId: string; name: string; photoUrl: string | null; role?: string; isPlayingXI: boolean; isCaptain: boolean; isWicketKeeper: boolean; battingOrder: number }
export interface SquadStaff { name: string; role: string }
export interface Squad { teamId: string; players: SquadMember[]; staff: SquadStaff[] }
export interface SquadPlayerInput { playerId: string; isPlayingXI: boolean; isCaptain: boolean; isWicketKeeper: boolean; battingOrder: number }

// ---------------- live match state ----------------
export interface Theme { primaryColor: string; secondaryColor: string; accentColor: string; logoUrl: string | null; watermarkUrl: string | null; watermarkText: string | null; useTeamColors: boolean }
export interface PlayerLite { id: string; name: string; shortName: string; photoUrl: string | null; isWicketKeeper: boolean }
export interface BatterCareer { label: string; matches: number | null; runs: number | null; average: number | null; strikeRate: number | null; fifties: number | null; hundreds: number | null }
export interface Batter {
  playerId: string; name: string; shortName: string; photoUrl: string | null; runs: number; balls: number; fours: number; sixes: number; strikeRate: number; onStrike: boolean
  firstName: string; lastName: string; jerseyNumber: number; battingStyle: string; career: BatterCareer | null
}
export interface Bowler { playerId: string; name: string; shortName: string; photoUrl: string | null; overs: string; maidens: number; runs: number; wickets: number; economy: number }
export interface InningsState {
  inningsId: string; inningsNumber: number; status: 'NotStarted' | 'InProgress' | 'Completed'; isFollowOn: boolean
  battingTeam: TeamLite; bowlingTeam: TeamLite
  runs: number; wickets: number; overs: string; legalBalls: number; currentRunRate: number; extras: number
  target: number | null; runsRequired: number | null; ballsRemaining: number | null; requiredRunRate: number | null
  projectedScore: number; leadText: string | null; leadRuns: number | null
  partnership: { runs: number; balls: number }
  freeHit: boolean; powerplay: boolean; newBallDue: boolean
  striker: Batter | null; nonStriker: Batter | null; bowler: Bowler | null
}
export interface InningsSummary { inningsNumber: number; teamShortName: string; runs: number; wickets: number; overs: string; isDeclared: boolean; text: string }
export type BallKind = 'Dot' | 'Runs' | 'Four' | 'Six' | 'Wicket' | 'Wide' | 'NoBall' | 'Bye' | 'LegBye'
export interface LastBall { ballId: string; label: string; kind: BallKind; runs: number }
// Penalty runs awarded without a ball. The id is new for every award, so the overlay can tell a new one from one already shown.
export interface LastPenalty { id: string; runs: number }
export interface BallChip { label: string; kind: BallKind }
export interface OverTimeline { overNumber: number; bowlerName: string; runs: number; wickets: number; legalBalls: number; isCompleted: boolean; balls: BallChip[] }
export interface TestClock { day: number; session: number; oversLeftToday: string; oversLostToday: number }
export interface WinProbability { home: number; draw: number; away: number }
export interface GraphicVisibility { isVisible: boolean; payload: Record<string, unknown> | null }
export type GraphicKey = 'Scorebug' | 'BatterCards' | 'BowlerCard' | 'Timeline' | 'WinProbability' | 'FullScorecard' | 'Banner' | 'TeamLineup'

export interface MatchActions {
  canRecordToss: boolean; canStartMatch: boolean; canStartInnings: boolean
  awaitingNewBatter: boolean; awaitingNewBowler: boolean; canScoreBall: boolean; canUndo: boolean
  inningsOver: boolean; canDeclare: boolean; followOnAvailable: boolean; canComplete: boolean
  nextBattingTeamId: string | null
  availableBatters: PlayerLite[]; eligibleBowlers: PlayerLite[]; battingXI: PlayerLite[]; fieldingXI: PlayerLite[]
}

export interface BatterLine { playerId: string; name: string; isCaptain: boolean; isWicketKeeper: boolean; runs: number; balls: number; fours: number; sixes: number; strikeRate: number; status: string; dismissalText: string }
export interface BowlerLine { playerId: string; name: string; overs: string; maidens: number; runs: number; wickets: number; wides: number; noBalls: number; economy: number }
export interface FallOfWicket { wicketNumber: number; score: number; overs: string; batterName: string }
export interface InningsScorecard {
  inningsNumber: number; battingTeam: TeamLite; runs: number; wickets: number; overs: string; extras: number; runRate: number; extrasText: string; isCompleted: boolean
  batting: BatterLine[]; bowling: BowlerLine[]; fallOfWickets: FallOfWicket[]; yetToBat: string[]
}

export interface LineupPlayer {
  playerId: string; firstName: string; lastName: string; displayName: string; photoUrl: string | null
  isCaptain: boolean; isWicketKeeper: boolean; battingOrder: number
}
export interface Lineup { team: TeamLite; players: LineupPlayer[] }
export interface Lineups { home: Lineup; away: Lineup }

export interface MatchState {
  matchId: string; version: number; title: string; format: string; isTest: boolean; status: MatchStatus
  resultText: string | null; resultType: string | null; tournamentName: string; venueName: string; backgroundUrl: string | null
  theme: Theme; homeTeam: TeamLite; awayTeam: TeamLite; tossText: string | null; ballsPerOver: number; oversPerInnings: number
  innings: InningsState | null; previousInnings: InningsSummary[]; scorecard: InningsScorecard[]
  lastBall: LastBall | null; lastPenalty?: LastPenalty | null; timeline: OverTimeline[]; testClock: TestClock | null; winProbability: WinProbability
  lineups: Lineups
  graphics: Record<GraphicKey, GraphicVisibility>; actions: MatchActions
}

// ---------------- requests ----------------
export type ExtrasType = 'None' | 'Wide' | 'NoBall' | 'Bye' | 'LegBye'
export type DismissalType = 'Bowled' | 'Caught' | 'LBW' | 'RunOut' | 'Stumped' | 'HitWicket' | 'HandledBall' | 'ObstructingField'
export interface WicketInput { dismissalType: DismissalType; dismissedPlayerId?: string | null; fielderId?: string | null; newBatterId?: string | null }
export interface ScoreBallInput {
  clientRequestId: string; runsBat: number; extraRuns: number; extrasType: ExtrasType; secondaryExtrasType: ExtrasType
  isBoundary: boolean; wicket?: WicketInput | null
}
