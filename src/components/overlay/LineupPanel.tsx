import type { CSSProperties } from 'react'
import type { Lineup, LineupPlayer, MatchState, Theme } from '../../lib/types'
import { assetUrl, initials } from '../../lib/utils'
import { TeamLogo } from './OverlayBits'
import { BOTH, BOTH_GAP, CARD_GAP, cardName, cardWidth, cardWidthBoth, fitFont, rowSizes, selectedLineups } from './lineup'

const FIRST_DELAY_MS = 450
const STEP_MS = 170

function PlayerCard({ player, width, color, accent, delay, order }: { player: LineupPlayer; width: number; color: string; accent: string; delay: number; order: number }) {
  const { first, last } = cardName(player)
  const photoH = Math.round(width * 1.12)
  const plateH = Math.round(width * 0.34)
  const photo = assetUrl(player.photoUrl)
  const plate = `color-mix(in srgb, ${color} 22%, #050b24)`
  const style: CSSProperties = {
    width, flexShrink: 0, animation: 'lineup-card-in .75s cubic-bezier(.2,.9,.3,1.12) both', animationDelay: `${delay}ms`,
    boxShadow: '0 14px 30px rgba(0,0,0,.55)', transformOrigin: '50% 100%',
  }
  return (
    <div data-testid="lineup-card" data-order={order} data-delay={delay} style={style}>
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

// The grid of one team: rows of 4, 4, 3. `offset` delays this team's cards a little, so two teams do not move in lockstep.
function Grid({ lineup, width, gap, color, accent, offset = 0 }: { lineup: Lineup; width: number; gap: number; color: string; accent: string; offset?: number }) {
  const sizes = rowSizes(lineup.players.length)
  let index = 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap, perspective: 1400 }}>
      {sizes.map((count, row) => (
        <div key={row} style={{ display: 'flex', gap, justifyContent: 'center' }}>
          {lineup.players.slice(index, index + count).map((p) => <PlayerCard key={p.playerId} player={p} width={width} color={color} accent={accent} delay={FIRST_DELAY_MS + offset + STEP_MS * index} order={++index} />)}
        </div>
      ))}
    </div>
  )
}

// The theme decides the colour; only a theme that asks for team colours lets each team wear its own.
const teamColor = (lineup: Lineup, theme: Theme) => (theme.useTeamColors ? (lineup.team.primaryColor ?? theme.primaryColor) : theme.primaryColor)

/**
 * Pre-match "player introduction": a team's playing XI rolls out card by card (4 / 4 / 3).
 * The producer (or scorer) picks one team, or both side by side (graphics.TeamLineup.payload.teamId = team id | "both").
 */
export function LineupPanel({ state }: { state: MatchState }) {
  const lineups = selectedLineups(state)
  if (lineups.length === 0) return null
  const { theme } = state
  const accent = theme.accentColor
  const scrim = 'linear-gradient(180deg, rgba(3,8,25,.9), rgba(3,8,25,.82))'

  if (lineups.length === 1) {
    const lineup = lineups[0]!
    const { team, players } = lineup
    const color = teamColor(lineup, theme)
    const width = cardWidth(rowSizes(players.length).length)
    return (
      <div data-testid="lineup-panel" data-team={team.id} style={{ position: 'absolute', inset: 0, background: scrim, color: '#fff' }}>
        <div className="anim-slide-down" style={{ position: 'absolute', left: 60, right: 60, top: 26, height: 96, display: 'flex', alignItems: 'center', gap: 24, padding: '0 28px', borderRadius: 18, background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 45%, #000))`, boxShadow: '0 10px 28px rgba(0,0,0,.5)' }}>
          <TeamLogo team={team} size={72} />
          <div className="font-display" style={{ fontSize: 58, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{team.name}</div>
          <div className="font-display" style={{ fontSize: 40, fontWeight: 600, letterSpacing: 6, color: accent }}>PLAYING XI</div>
          <div className="font-display" style={{ marginLeft: 'auto', textAlign: 'right', fontSize: 26, lineHeight: 1.15, opacity: 0.95 }}>
            <div>{state.tournamentName}</div>
            <div style={{ opacity: 0.8 }}>{state.venueName}</div>
          </div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 150 }}>
          <Grid lineup={lineup} width={width} gap={CARD_GAP} color={color} accent={accent} />
        </div>
      </div>
    )
  }

  // both teams, side by side
  const [home, away] = lineups as [Lineup, Lineup]
  const rows = Math.max(rowSizes(home.players.length).length, rowSizes(away.players.length).length)
  const width = cardWidthBoth(rows)
  const side = (lineup: Lineup, offset: number) => {
    const color = teamColor(lineup, theme)
    return (
      <div key={lineup.team.id} data-testid="lineup-column" data-team={lineup.team.id}>
        <div className="font-display anim-slide-down" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, height: 44, marginBottom: 12, borderRadius: 10, background: `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 45%, #000))`, fontSize: 30, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          <TeamLogo team={lineup.team} size={32} />{lineup.team.name}
        </div>
        <Grid lineup={lineup} width={width} gap={BOTH_GAP} color={color} accent={accent} offset={offset} />
      </div>
    )
  }
  return (
    <div data-testid="lineup-panel" data-team={BOTH} style={{ position: 'absolute', inset: 0, background: scrim, color: '#fff' }}>
      <div className="anim-slide-down" style={{ position: 'absolute', left: 60, right: 60, top: 26, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, borderRadius: 18, background: 'linear-gradient(90deg, rgba(15,23,42,.9), rgba(30,41,59,.9), rgba(15,23,42,.9))', border: `2px solid ${accent}`, boxShadow: '0 10px 28px rgba(0,0,0,.5)' }}>
        <div className="font-display" style={{ fontSize: 56, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{home.team.name}</div>
        <div className="font-display" style={{ fontSize: 38, fontWeight: 600, letterSpacing: 6, color: accent }}>PLAYING XI</div>
        <div className="font-display" style={{ fontSize: 56, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{away.team.name}</div>
      </div>
      <div style={{ position: 'absolute', left: 60, right: 60, top: 140, display: 'flex', justifyContent: 'space-between' }}>
        {side(home, 0)}
        {side(away, STEP_MS / 2)}
      </div>
    </div>
  )
}
