import type { MatchState } from '../../lib/types'
import { BallChipView } from './BallChipView'

/** A hollow circle for a legal ball still to be bowled in the current over (as on the TV graphic). */
function EmptySlot({ size }: { size: number }) {
  return <span data-testid="empty-slot" style={{ width: size, height: size, flexShrink: 0, borderRadius: '50%', border: '3px solid rgba(255,255,255,.55)', boxSizing: 'border-box' }} />
}

export function TimelineBar({ state }: { state: MatchState }) {
  const { theme, timeline, ballsPerOver } = state
  return (
    <div data-testid="timeline" style={{ position: 'absolute', left: 40, right: 40, bottom: 28, height: 66, display: 'flex', alignItems: 'center', gap: 30, padding: '0 22px', borderRadius: 14, background: `linear-gradient(90deg, ${theme.secondaryColor}, #2a0a3d)`, color: '#fff', boxShadow: '0 6px 20px rgba(0,0,0,.4)' }}>
      <span className="font-display" style={{ fontSize: 38, fontWeight: 700, fontStyle: 'italic', letterSpacing: 2, color: theme.accentColor }}>TIMELINE</span>
      {timeline.length === 0 && <span className="font-display" style={{ fontSize: 26, opacity: 0.7 }}>First ball awaited</span>}
      {timeline.map((o) => {
        const remaining = o.isCompleted ? 0 : Math.max(0, ballsPerOver - (o.legalBalls ?? o.balls.length))
        return (
          <div key={o.overNumber} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 22, borderLeft: '2px solid rgba(255,255,255,.35)' }}>
            <span className="font-display" style={{ fontSize: 28, fontWeight: 600, color: theme.accentColor }}>{`Over ${o.overNumber}`}</span>
            {o.balls.map((b, i) => <BallChipView key={i} chip={b} size={44} />)}
            {Array.from({ length: remaining }, (_, i) => <EmptySlot key={`e${i}`} size={44} />)}
            <span className="font-display" style={{ fontSize: 34, fontWeight: 700, color: '#fff' }}>{`= ${o.runs}`}</span>
          </div>
        )
      })}
    </div>
  )
}
