import type { Batter, TeamLite, Theme } from '../../lib/types'
import { BatIcon, PlayerPhoto, TeamLogo } from './OverlayBits'

export const CARD_W = 560
export const CARD_H = 230

export function CardShell({ label, team, theme, marker, photo, children, stats }: {
  label: string; team: TeamLite; theme: Theme; marker?: boolean
  photo: { name: string; url: string | null }; children: React.ReactNode; stats: string[]
}) {
  return (
    <div style={{ position: 'relative', width: CARD_W, height: CARD_H, color: '#fff' }}>
      <div style={{ position: 'absolute', inset: 0, borderRadius: 16, overflow: 'hidden', background: `linear-gradient(135deg, ${theme.primaryColor}, #052e22)`, boxShadow: '0 10px 30px rgba(0,0,0,.45)' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, right: 0, height: 56, background: '#000', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px 0 150px' }}>
          <TeamLogo team={team} size={38} />
          <span className="font-display" style={{ fontSize: 34, fontWeight: 700, letterSpacing: 2, color: theme.accentColor }}>{label}</span>
          {marker && <span data-testid="strike-marker" style={{ marginLeft: 'auto' }}><BatIcon size={34} color="#4ade80" /></span>}
        </div>
        <div style={{ position: 'absolute', left: 150, right: 12, top: 62, bottom: 56, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
          {children}
        </div>
        <div className="font-display" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 52, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, fontSize: 30, fontWeight: 600 }}>
          {stats.map((s) => <span key={s}>{s}</span>)}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 8, bottom: 52, width: 140, height: 190, pointerEvents: 'none', display: 'flex', alignItems: 'flex-end' }}>
        <PlayerPhoto name={photo.name} photoUrl={photo.url} width={140} height={190} />
      </div>
    </div>
  )
}

export function BatterCard({ batter, team, theme }: { batter: Batter; team: TeamLite; theme: Theme }) {
  return (
    <CardShell
      label="BATSMAN" team={team} theme={theme} marker={batter.onStrike} photo={{ name: batter.name, url: batter.photoUrl }}
      stats={[`4s:${batter.fours}`, `6s:${batter.sixes}`, `SR:${batter.strikeRate.toFixed(2)}`]}
    >
      <div className="font-display" style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{batter.name}</div>
      <div className="font-display" style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.05, color: theme.accentColor, whiteSpace: 'nowrap' }}>{`${batter.runs} (${batter.balls})`}</div>
    </CardShell>
  )
}
