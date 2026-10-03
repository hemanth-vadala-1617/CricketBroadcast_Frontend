import type { ReactNode } from 'react'
import type { MatchState } from '../../lib/types'
import { BatIcon, TeamLogo } from './OverlayBits'
import { LastBallBox } from './LastBallBox'

function darken(hex: string) {
  return `color-mix(in srgb, ${hex} 55%, #000)`
}

const chip = (bg: string, fg = '#fff') => ({ background: bg, color: fg, borderRadius: 8, padding: '2px 14px', fontWeight: 700, letterSpacing: 1 } as const)

/** Top bar + the two info strips (the TV scorebug from the reference). */
export function Scorebug({ state, winProb, boxDelayMs = 0 }: { state: MatchState; winProb?: ReactNode; boxDelayMs?: number }) {
  const inn = state.innings
  if (!inn) return null
  const { theme } = state
  const bat = inn.battingTeam
  const bowl = inn.bowlingTeam
  const previous = state.previousInnings
  // The theme decides. Only when it asks for team colours does each bar wear its own team colour (the theme colour is then the fallback).
  const batColor = theme.useTeamColors ? (bat.primaryColor ?? theme.primaryColor) : theme.primaryColor
  const bowlColor = theme.useTeamColors ? (bowl.primaryColor ?? theme.primaryColor) : theme.primaryColor

  return (
    <div data-testid="scorebug" style={{ position: 'absolute', left: 40, top: 28, width: 1840, color: '#fff' }}>
      {/* ---- top bar ---- */}
      <div style={{ display: 'flex', alignItems: 'stretch', height: 132, filter: 'drop-shadow(0 8px 14px rgba(0,0,0,.45))' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 20, padding: '0 24px 0 14px', borderRadius: '66px 0 0 0', background: `linear-gradient(90deg, ${batColor}, ${darken(batColor)})` }}>
          <TeamLogo team={bat} size={104} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="font-display" style={{ fontSize: 34, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.1 }}>{bat.name}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
              <span className="font-display" data-testid="score" style={{ fontSize: 86, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap' }}>{`${inn.runs}-${inn.wickets}`}</span>
              <span className="font-display" data-testid="overs" style={{ fontSize: 44, fontWeight: 600, color: theme.accentColor, whiteSpace: 'nowrap' }}>{inn.overs}</span>
            </div>
            {inn.requiredRunRate !== null && (
              <div className="font-display" data-testid="rrr" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1, marginTop: 2 }}>{`RRR : ${inn.requiredRunRate.toFixed(2)}`}</div>
            )}
          </div>
          <BatIcon size={44} />
        </div>

        <LastBallBox state={state} delayMs={boxDelayMs} />

        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 20, padding: '0 14px 0 24px', borderRadius: '0 66px 0 0', background: `linear-gradient(270deg, ${darken(bowlColor)}, ${bowlColor})` }}>
          <div style={{ minWidth: 0, flex: 1, textAlign: 'right' }}>
            <div className="font-display" style={{ fontSize: 34, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.1 }}>{bowl.name}</div>
            <div className="font-display" style={{ fontSize: 66, fontWeight: 700, fontStyle: 'italic', color: theme.accentColor, lineHeight: 1, letterSpacing: 2 }}>BOWLING</div>
            {previous.length > 0 && (
              <div className="font-display" style={{ fontSize: 26, fontWeight: 500, opacity: 0.95, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {previous.map((p) => p.text).join('   ')}
              </div>
            )}
          </div>
          <TeamLogo team={bowl} size={104} />
        </div>
      </div>

      {/* ---- strip 1: rates, partnership, lead / target ---- */}
      <div className="font-display" style={{ height: 54, display: 'flex', alignItems: 'center', gap: 44, padding: '0 32px', background: theme.secondaryColor, fontSize: 36, fontWeight: 600 }}>
        <span>{`CRR: ${inn.currentRunRate.toFixed(2)}`}</span>
        <span>{`P'SHIP: ${inn.partnership.runs}(${inn.partnership.balls})`}</span>
        {inn.target !== null && <span>{`Target: ${inn.target}`}</span>}
        <span style={{ marginLeft: 'auto', color: theme.accentColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inn.leadText ?? ''}</span>
      </div>

      {/* ---- strip 2: clock / limited-overs status / win probability ---- */}
      <div className="font-display" style={{ height: 50, display: 'flex', alignItems: 'center', gap: 28, padding: '0 32px', background: `color-mix(in srgb, ${theme.secondaryColor} 55%, #e11d8f)`, fontSize: 32, fontWeight: 600, borderRadius: '0 0 18px 18px' }}>
        {state.isTest && state.testClock ? (
          <>
            <span style={chip('rgba(0,0,0,.35)')}>{`Day ${state.testClock.day} : Session ${state.testClock.session}`}</span>
            <span style={chip('rgba(0,0,0,.35)', theme.accentColor)}>{`Overs left today: ${state.testClock.oversLeftToday}`}</span>
          </>
        ) : (
          <>
            <span style={chip('rgba(0,0,0,.35)')}>{state.oversPerInnings > 0 ? `Overs ${inn.overs}/${state.oversPerInnings}` : `Overs ${inn.overs}`}</span>
            {inn.powerplay && <span style={chip('#0ea5e9')}>POWERPLAY</span>}
          </>
        )}
        {inn.freeHit && <span className="anim-flash" style={chip('#f97316')}>FREE HIT</span>}
        {inn.newBallDue && <span style={chip('#facc15', '#1c1917')}>NEW BALL DUE</span>}
        <div style={{ marginLeft: 'auto' }}>{winProb}</div>
      </div>
    </div>
  )
}
