import type { MatchState } from '../../lib/types'

/** "AUS 41%  DRAW 7%  BAN 52%". Renders nothing when the producer has not set (or has hidden) the numbers. */
export function WinProbabilityStrip({ state }: { state: MatchState }) {
  const { home, draw, away } = state.winProbability
  if (home + draw + away === 0) return null
  const seg = (text: string, color: string) => (
    <span key={text} className="font-display" style={{ fontSize: 30, fontWeight: 700, color, letterSpacing: 1 }}>{text}</span>
  )
  return (
    <div data-testid="win-probability" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
      {seg(`${state.homeTeam.shortName} ${home}%`, '#fff')}
      {state.isTest && seg(`DRAW ${draw}%`, '#fde047')}
      {seg(`${state.awayTeam.shortName} ${away}%`, '#fff')}
    </div>
  )
}
