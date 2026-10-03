import type { Bowler, TeamLite, Theme } from '../../lib/types'
import { CardShell } from './BatterCard'

export function BowlerCard({ bowler, team, theme }: { bowler: Bowler; team: TeamLite; theme: Theme }) {
  return (
    <CardShell
      label="BOWLER" team={team} theme={theme} photo={{ name: bowler.name, url: bowler.photoUrl }}
      stats={[`Econ:${bowler.economy.toFixed(2)}`]}
    >
      <div className="font-display" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bowler.name}</div>
      <div className="font-display" style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.05, color: theme.accentColor, whiteSpace: 'nowrap' }}>{`${bowler.wickets}-${bowler.runs} (${bowler.overs})`}</div>
    </CardShell>
  )
}
