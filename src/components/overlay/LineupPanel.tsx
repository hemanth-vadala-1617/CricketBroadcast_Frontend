import type { CSSProperties } from 'react'
import type { LineupPlayer, MatchState } from '../../lib/types'
import { assetUrl, initials } from '../../lib/utils'
import { TeamLogo } from './OverlayBits'
import { CARD_GAP, cardName, cardWidth, fitFont, rowSizes, selectedLineup } from './lineup'

const FIRST_DELAY_MS = 450
const STEP_MS = 170

function PlayerCard({ player, width, color, accent, index }: { player: LineupPlayer; width: number; color: string; accent: string; index: number }) {
  const { first, last } = cardName(player)
  const photoH = Math.round(width * 1.12)
  const plateH = Math.round(width * 0.34)
  const photo = assetUrl(player.photoUrl)
  const plate = `color-mix(in srgb, ${color} 22%, #050b24)`
  const style: CSSProperties = {
    width, flexShrink: 0, animation: 'lineup-card-in .75s cubic-bezier(.2,.9,.3,1.12) both', animationDelay: `${FIRST_DELAY_MS + index * STEP_MS}ms`,
    boxShadow: '0 14px 30px rgba(0,0,0,.55)', transformOrigin: '50% 100%',
  }
  return (
    <div data-testid="lineup-card" data-order={index + 1} style={style}>
      <div style={{ height: photoH, background: `linear-gradient(180deg, color-mix(in srgb, ${color} 80%, #fff) 0%, ${color} 70%)`, overflow: 'hidden', display: 'grid', placeItems: photo ? undefined : 'center' }}>
        {photo
          ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
          : <span className="font-display" style={{ fontSize: width * 0.3, fontWeight: 700, color: 'rgba(255,255,255,.75)' }}>{initials(player.displayName)}</span>}
      </div>
      <div className="font-display" style={{ height: plateH, background: plate, borderTop: `3px solid ${accent}`, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8px', lineHeight: 1.05, textTransform: 'uppercase', overflow: 'hidden' }}>
        {first && <span style={{ fontSize: fitFont(first, width - 16, width * 0.115), color: '#e2e8f0', fontWeight: 500, letterSpacing: 1, whiteSpace: 'nowrap' }}>{first}</span>}
        <span style={{ fontSize: fitFont(last, width - 16, width * 0.19), color: accent, fontWeight: 600, letterSpacing: 1, whiteSpace: 'nowrap' }}>{last}</span>
      </div>
    </div>
  )
}

/**
 * Pre-match "player introduction": the chosen team's playing XI rolls out card by card (4 / 4 / 3).
 * Which team is on air comes from the producer (graphics.TeamLineup.payload.teamId).
 */
export function LineupPanel({ state }: { state: MatchState }) {
  const lineup = selectedLineup(state)
  if (!lineup) return null
  const { team, players } = lineup
  const { theme } = state
  const color = team.primaryColor ?? theme.primaryColor
  const accent = theme.accentColor
  const sizes = rowSizes(players.length)
  const width = cardWidth(sizes.length)
  let index = 0

  return (
    <div data-testid="lineup-panel" data-team={team.id} style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(3,8,25,.9), rgba(3,8,25,.82))', color: '#fff' }}>
      <div className="anim-slide-down" style={{ position: 'absolute', left: 60, right: 60, top: 26, height: 96, display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px', borderRadius: 18, background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 45%, #000))`, boxShadow: '0 10px 28px rgba(0,0,0,.5)' }}>
        <TeamLogo team={team} size={72} />
        <div className="font-display" style={{ fontSize: 58, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{team.name}</div>
        <div className="font-display" style={{ fontSize: 40, fontWeight: 600, letterSpacing: 6, color: accent }}>PLAYING XI</div>
        <div className="font-display" style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 26, lineHeight: 1.15, opacity: 0.95 }}>
          <div>{state.tournamentName}</div>
          <div style={{ opacity: 0.8 }}>{state.venueName}</div>
        </div>
      </div>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: CARD_GAP, perspective: 1400 }}>
        {sizes.map((count, row) => (
          <div key={row} style={{ display: 'flex', gap: CARD_GAP, justifyContent: 'center' }}>
            {players.slice(index, index + count).map((p) => <PlayerCard key={p.playerId} player={p} width={width} color={color} accent={accent} index={index++} />)}
          </div>
        ))}
      </div>
    </div>
  )
}