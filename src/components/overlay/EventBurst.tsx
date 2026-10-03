import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { MatchState } from '../../lib/types'

/** How long a burst stays on air. */
export const EVENT_MS = 3800

// The small last-ball box starts its own motion this long AFTER the burst starts: late enough that the big text has
// landed (it settles after ~0.8 s), early enough that both are on screen together, not one after the other.
export const BOX_AFTER_BURST_MS = 1000

export type BurstKind = 'Four' | 'Six' | 'Wicket' | 'NoBall' | 'Wide' | 'Penalty'

export interface Burst {
  id: string
  kind: BurstKind
  title: string
  // One small label shown ABOVE the word inside the same stripe (only: FREE HIT NEXT BALL after a no-ball).
  tag?: string
}

const TRIGGERS: ReadonlySet<string> = new Set<BurstKind>(['Four', 'Six', 'Wicket', 'NoBall', 'Wide'])
const TITLES: Record<BurstKind, string> = { Four: 'FOUR', Six: 'SIX', Wicket: 'OUT!', NoBall: 'NO BALL', Wide: 'WIDE', Penalty: 'PENALTY' }

// Penalty runs are not a ball, so they have their own announcement (state.lastPenalty). The amount sits ABOVE the word.
export function describePenalty(state: MatchState): Burst | null {
  const p = state.lastPenalty
  if (!p || p.runs <= 0) return null
  return { id: p.id, kind: 'Penalty', title: TITLES.Penalty, tag: `+${p.runs} ${p.runs === 1 ? 'RUN' : 'RUNS'}` }
}

// Turns the server's last ball into the animation (null = nothing to show).
// The burst is the highlighted word: no batter, bowler, score or extras under it (the scorebug already carries those).
// The one exception is the free-hit warning after a no-ball, which goes on TOP of the word, not under it.
export function describeBurst(state: MatchState): Burst | null {
  const ball = state.lastBall
  if (!ball || !TRIGGERS.has(ball.kind)) return null
  const kind = ball.kind as BurstKind
  const burst: Burst = { id: ball.ballId, kind, title: TITLES[kind] }
  if (kind === 'NoBall' && state.innings?.freeHit) burst.tag = 'FREE HIT NEXT BALL'
  return burst
}

const font = 'var(--font-display)'

// The coloured stripe and the text are laid out from the SAME numbers, so the word sits exactly in the middle of its stripe.
export const STRIPE = {
  main: { top: 330, height: 330 },    // FOUR, SIX, OUT
  amber: { top: 345, height: 300 },   // NO BALL, WIDE: same centre line as the others, tall enough for the tag + the words
} as const
type Geometry = { top: number; height: number }
const middle = (g: Geometry) => g.top + g.height / 2

function Stripe({ from, via, geo, ms }: { from: string; via: string; geo: Geometry; ms: number }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top: geo.top, height: geo.height,
      background: `linear-gradient(90deg, ${from}, ${via} 30%, ${via} 70%, ${from})`,
      boxShadow: '0 0 60px rgba(0,0,0,.55)', transformOrigin: 'center', animation: `ev-stripe ${ms}ms ease-out both`,
    }} />
  )
}

// Exactly the stripe's box, with the word centred in it.
function Band({ geo, children }: { geo: Geometry; children: ReactNode }) {
  return <div data-band style={{ position: 'absolute', left: 0, right: 0, top: geo.top, height: geo.height, display: 'grid', placeItems: 'center' }}>{children}</div>
}

// Capital letters sit a little below the middle of a line box in this font, so the word is nudged up by that amount
// (padding-bottom of 0.09em shifts the centred glyphs up by about 0.045em) to look centred, not just be centred.
const title = (fontSize: number): CSSProperties => ({ fontFamily: font, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap', fontSize, paddingBottom: '0.09em' })

function Ball({ delay = 0.15 }: { delay?: number }) {
  const size = 74
  return (
    <div style={{
      position: 'absolute', top: middle(STRIPE.main) - size / 2, left: 0, width: size, height: size, borderRadius: '50%',
      background: 'radial-gradient(circle at 30% 30%, #fca5a5, #dc2626 55%, #7f1d1d)', boxShadow: '0 0 30px rgba(255,255,255,.7)',
      animation: `ev-ball-run 1.35s cubic-bezier(.45,0,.9,.55) ${delay}s both`,
    }} />
  )
}

function Stumps() {
  const bars = [{ dx: -260, rot: -62 }, { dx: 40, rot: 14 }, { dx: 300, rot: 70 }]
  return (
    <div style={{ position: 'absolute', left: 1330, top: middle(STRIPE.main) - 115, width: 200, height: 230 }}>
      {bars.map((b, i) => (
        <span key={i} style={{
          position: 'absolute', left: 30 + i * 62, bottom: 0, width: 16, height: 170, borderRadius: 6, background: '#fef3c7',
          boxShadow: '0 0 10px rgba(0,0,0,.5)', transformOrigin: 'bottom center',
          ['--dx' as string]: `${b.dx}px`, ['--rot' as string]: `${b.rot}deg`, animation: 'ev-stump 1.5s ease-in .35s both',
        }} />
      ))}
    </div>
  )
}

function BurstView({ burst, ms }: { burst: Burst; ms: number }) {
  const { kind } = burst
  const word = burst.title

  if (kind === 'Four') {
    return (
      <>
        <Stripe from="#052e16" via="#16a34a" geo={STRIPE.main} ms={ms} />
        <Ball />
        <Band geo={STRIPE.main}>
          <span style={{ ...title(300), fontStyle: 'italic', color: '#fff', textShadow: '0 10px 0 #14532d, 0 0 50px rgba(74,222,128,.95)', animation: `ev-text-left ${ms}ms ease-out both` }}>{word}</span>
        </Band>
      </>
    )
  }
  if (kind === 'Six') {
    return (
      <>
        <div style={{ position: 'absolute', left: 960 - 800, top: middle(STRIPE.main) - 800, width: 1600, height: 1600, borderRadius: '50%', background: 'repeating-conic-gradient(rgba(253,224,71,.95) 0 7deg, transparent 7deg 22deg)', WebkitMaskImage: 'radial-gradient(circle, #000 12%, transparent 68%)', maskImage: 'radial-gradient(circle, #000 12%, transparent 68%)', animation: 'ev-rays 1.9s ease-out both' }} />
        <Stripe from="#3b0764" via="#7e22ce" geo={STRIPE.main} ms={ms} />
        <Band geo={STRIPE.main}>
          <span style={{ ...title(380), color: '#fde047', textShadow: '0 12px 0 #581c87, 0 0 60px rgba(250,204,21,.95)', animation: `ev-pop-shake ${ms}ms ease-out both` }}>{word}</span>
        </Band>
      </>
    )
  }
  if (kind === 'Wicket') {
    return (
      <>
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 260px 70px rgba(220,38,38,.95)', animation: 'ev-vignette 1.8s ease-out both' }} />
        <Stripe from="#450a0a" via="#dc2626" geo={STRIPE.main} ms={ms} />
        <Stumps />
        <Band geo={STRIPE.main}>
          <span style={{ ...title(330), color: '#fff', textShadow: '0 12px 0 #7f1d1d, 0 0 50px rgba(0,0,0,.6)', animation: `ev-slam ${ms}ms ease-out both` }}>{word}</span>
        </Band>
      </>
    )
  }
  if (kind === 'Penalty') {
    // runs awarded without a ball: a rubber-stamp slam on a deep blue stripe, the amount as a tag above the word
    return (
      <>
        <Stripe from="#172554" via="#2563eb" geo={STRIPE.amber} ms={ms} />
        <Band geo={STRIPE.amber}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: `ev-stamp ${ms}ms cubic-bezier(.2,.9,.3,1.2) both` }}>
            {burst.tag && (
              <span style={{ fontFamily: font, fontWeight: 700, fontSize: 56, letterSpacing: 6, lineHeight: 1.1, color: '#1e3a8a', background: '#fde047', padding: '2px 26px', borderRadius: 8, whiteSpace: 'nowrap' }}>{burst.tag}</span>
            )}
            <span style={{ ...title(200), color: '#fff', textShadow: '0 8px 0 #1e3a8a, 0 0 40px rgba(147,197,253,.9)' }}>{word}</span>
          </div>
        </Band>
      </>
    )
  }
  // NoBall / Wide: amber call-out
  return (
    <>
      <Stripe from="#451a03" via="#f59e0b" geo={STRIPE.amber} ms={ms} />
      <Band geo={STRIPE.amber}>
        {/* tag (if any) above the word; the two are centred in the stripe together */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: `ev-slide-up ${ms}ms ease-out both` }}>
          {burst.tag && (
            <span style={{ fontFamily: font, fontWeight: 700, fontSize: 46, letterSpacing: 6, lineHeight: 1.1, color: '#1c1917', background: 'rgba(255,255,255,.5)', padding: '2px 24px', borderRadius: 8, whiteSpace: 'nowrap' }}>{burst.tag}</span>
          )}
          <span style={{ ...title(200), color: '#1c1917', textShadow: '0 6px 0 rgba(255,255,255,.35)' }}>{word}</span>
        </div>
      </Band>
    </>
  )
}

/**
 * TV-style full-screen animations for FOUR, SIX, OUT, NO BALL and WIDE.
 * Plays once per NEW ball: the ball that was already last when the page loaded, and the earlier ball that
 * becomes "last" again after an undo, never replay. A newer event replaces one still on screen (non-blocking).
 */
export function EventBurst({ state, durationMs = EVENT_MS }: { state: MatchState; durationMs?: number }) {
  const ballId = state.lastBall?.ballId ?? null
  const penaltyId = state.lastPenalty?.id ?? null
  const seenBalls = useRef<Set<string> | null>(null)
  const seenPenalties = useRef<Set<string> | null>(null)
  seenBalls.current ??= new Set(ballId ? [ballId] : [])
  seenPenalties.current ??= new Set(penaltyId ? [penaltyId] : [])
  const [burst, setBurst] = useState<Burst | null>(null)

  useEffect(() => {
    // a NEW penalty award or a NEW ball starts a burst; what was already on the board at load, or comes back after an undo, does not
    const newPenalty = !!penaltyId && !seenPenalties.current!.has(penaltyId)
    const newBall = !!ballId && !seenBalls.current!.has(ballId)
    if (penaltyId) seenPenalties.current!.add(penaltyId)
    if (ballId) seenBalls.current!.add(ballId)
    const next = newPenalty ? describePenalty(state) : newBall ? describeBurst(state) : null
    if (!next) return
    setBurst(next)
    const t = setTimeout(() => setBurst(null), durationMs)
    return () => clearTimeout(t)
    // decided by the ids only; later state versions must not restart it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ballId, penaltyId])

  if (!burst) return null
  return (
    <div key={burst.id} data-testid="event-burst" data-kind={burst.kind} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', animation: `ev-fade ${durationMs}ms linear both` }}>
      <BurstView burst={burst} ms={durationMs} />
    </div>
  )
}
