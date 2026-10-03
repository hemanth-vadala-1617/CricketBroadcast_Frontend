import { assetUrl } from '../../lib/utils'
import type { MatchState } from '../../lib/types'
import { BannerBar } from './BannerBar'
import { BatterCard, CARD_W } from './BatterCard'
import { BowlerCard } from './BowlerCard'
import { BOX_AFTER_BURST_MS, EventBurst } from './EventBurst'
import { FullScorecardPanel } from './FullScorecardPanel'
import { InfoCard } from './InfoCard'
import { LineupPanel } from './LineupPanel'
import { NewBatterCard, useNewBatter } from './NewBatterCard'
import { selectedLineups } from './lineup'
import { Presence } from './OverlayBits'
import { Scorebug } from './Scorebug'
import { TimelineBar } from './TimelineBar'
import { WinProbabilityStrip } from './WinProbabilityStrip'
import { CANVAS_H, CANVAS_W, useFitScale } from './useFitScale'

function summaryLines(state: MatchState): string[] {
  return state.scorecard.map((c) => `${c.battingTeam.name} ${c.runs}-${c.wickets} (${c.overs})`)
}

/** Fixed 1920x1080 broadcast canvas, scaled to fit. Transparent unless showBackground (previews). */
export function BroadcastOverlay({ state, showBackground = false }: { state: MatchState; showBackground?: boolean }) {
  const scale = useFitScale()
  const { theme, graphics, innings } = state
  const status = state.status
  const finished = status === 'Completed' || status === 'Abandoned' || status === 'Cancelled'
  const inPlay = !!innings && (status === 'Live' || status === 'RainDelay' || status === 'Paused')
  const showScorebug = !!innings && graphics.Scorebug.isVisible
  const showWin = graphics.WinProbability.isVisible && state.winProbability.home + state.winProbability.draw + state.winProbability.away > 0
  const bg = assetUrl(state.backgroundUrl)
  const { shown: newBatter, held } = useNewBatter(state, inPlay)

  const canvasBg = showBackground
    ? { background: bg ? `center / cover url(${bg})` : 'linear-gradient(180deg, #14532d 0%, #166534 45%, #3f6212 100%)' }
    : { background: 'transparent' }

  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: showBackground ? '#000' : 'transparent' }}>
      <div
        data-testid="overlay-canvas"
        style={{
          position: 'absolute', left: (window.innerWidth - CANVAS_W * scale) / 2, top: (window.innerHeight - CANVAS_H * scale) / 2,
          width: CANVAS_W, height: CANVAS_H, transform: `scale(${scale})`, transformOrigin: 'top left', overflow: 'hidden',
          ...canvasBg,
          ['--c-primary' as string]: theme.primaryColor, ['--c-secondary' as string]: theme.secondaryColor, ['--c-accent' as string]: theme.accentColor,
        }}
      >
        {/* Scorebug (+ win probability tucked into strip 2) */}
        <Presence show={showScorebug} enter="down">
          <Scorebug state={state} winProb={showWin ? <WinProbabilityStrip state={state} /> : undefined} boxDelayMs={inPlay ? BOX_AFTER_BURST_MS : 0} />
        </Presence>
        {!showScorebug && (
          <Presence show={showWin} enter="down">
            <div style={{ position: 'absolute', left: 40, top: 28, padding: '10px 36px', borderRadius: 16, background: `color-mix(in srgb, ${theme.secondaryColor} 55%, #e11d8f)`, color: '#fff' }}>
              <WinProbabilityStrip state={state} />
            </div>
          </Presence>
        )}

        {/* Bottom cards */}
        <Presence show={inPlay && graphics.BatterCards.isVisible && !!innings && (!!innings.striker || !!innings.nonStriker)} enter="up">
          {innings && (
            <div style={{ position: 'absolute', left: 40, bottom: 112, display: 'flex', gap: 20 }}>
              {(held?.slot === 'striker' || innings.striker) && <BatterCard batter={held?.slot === 'striker' ? held.batter : innings.striker!} team={innings.battingTeam} theme={theme} out={held?.slot === 'striker' ? held.label : undefined} detail={held?.slot === 'striker' ? held.detail : undefined} />}
              {(held?.slot === 'nonStriker' || innings.nonStriker) && <BatterCard batter={held?.slot === 'nonStriker' ? held.batter : innings.nonStriker!} team={innings.battingTeam} theme={theme} out={held?.slot === 'nonStriker' ? held.label : undefined} detail={held?.slot === 'nonStriker' ? held.detail : undefined} />}
            </div>
          )}
        </Presence>
        <Presence show={inPlay && graphics.BowlerCard.isVisible && !!innings?.bowler} enter="up">
          {innings?.bowler && (
            <div style={{ position: 'absolute', left: 40 + 2 * (CARD_W + 20), bottom: 112 }}>
              <BowlerCard bowler={innings.bowler} team={innings.bowlingTeam} theme={theme} />
            </div>
          )}
        </Presence>

        <Presence show={inPlay && graphics.Timeline.isVisible} enter="up"><TimelineBar state={state} /></Presence>

        {/* Channel watermark: a logo sits bottom right; a text tag (LIVE) sits top right, just above the scorebug, as on TV */}
        {(theme.watermarkUrl || theme.logoUrl) && (
          <div style={{ position: 'absolute', right: 40, bottom: 112, maxWidth: 150, textAlign: 'center' }}>
            <img src={assetUrl(theme.watermarkUrl ?? theme.logoUrl)} alt="" style={{ maxWidth: 140, maxHeight: 90, objectFit: 'contain', opacity: 0.9 }} />
          </div>
        )}
        {!theme.watermarkUrl && !theme.logoUrl && theme.watermarkText && (
          <span data-testid="watermark-tag" className="font-display" style={{ position: 'absolute', right: 40, top: 0, height: 26, display: 'flex', alignItems: 'center', fontSize: 20, fontWeight: 700, letterSpacing: 3, color: '#fff', background: '#dc2626', padding: '0 14px', borderRadius: '0 0 6px 6px' }}>{theme.watermarkText}</span>
        )}

        {/* States without live play */}
        {!innings && !finished && (
          <InfoCard title="Match starts soon" accent={theme.accentColor} lines={[`${state.homeTeam.name} vs ${state.awayTeam.name}`, state.tossText ?? '', state.venueName]} />
        )}
        {status === 'InningsBreak' && <InfoCard title="Innings break" accent={theme.accentColor} lines={summaryLines(state)} />}
        {(status === 'RainDelay' || status === 'Paused') && <InfoCard title="Play suspended" accent="#f59e0b" lines={[status === 'RainDelay' ? 'Rain delay' : 'Play paused']} />}
        {finished && <InfoCard title={status === 'Abandoned' ? 'Match abandoned' : 'Full time'} accent={theme.accentColor} lines={[state.resultText ?? '', ...summaryLines(state)]} />}

        <Presence show={graphics.FullScorecard.isVisible && state.scorecard.length > 0} enter="pop"><FullScorecardPanel state={state} /></Presence>

        {/* Stacking order, bottom to top. Later = in front: the banner stays BEHIND the player introduction,
            and the big FOUR / SIX / OUT / NO BALL / WIDE / PENALTY bursts are in front of everything. */}
        <Presence show={graphics.Banner.isVisible} enter="up"><BannerBar state={state} /></Presence>

        {/* Pre-match player introduction: shows in any match state, before or during play */}
        <Presence show={selectedLineups(state).length > 0} enter="up"><LineupPanel state={state} /></Presence>

        {inPlay && newBatter && <NewBatterCard key={newBatter.playerId} batter={newBatter} state={state} />}

        {inPlay && <EventBurst state={state} />}
      </div>
    </div>
  )
}
