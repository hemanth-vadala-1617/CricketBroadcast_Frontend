import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { MatchState } from '../../lib/types'
import { playSiren } from '../../lib/sound'

/** How long a burst stays on air. */
export const EVENT_MS = 3800

// The small last-ball box starts its own motion this long AFTER the burst starts: late enough that the big text has
// landed (it settles after ~0.8 s), early enough that both are on screen together, not one after the other.
export const BOX_AFTER_BURST_MS = 1000

export type BurstKind = 'Four' | 'Six' | 'Wicket' | 'NoBall' | 'Wide' | 'Penalty' | 'PowerSurge'

export interface Burst {
  id: string
  kind: BurstKind
  title: string
  // One small label shown ABOVE the word inside the same stripe (only: FREE HIT NEXT BALL after a no-ball).
  tag?: string
  // Sixes in a row by the same batter, ending with this ball (2 or more makes it the "back-to-back" announcement).
  streak?: number
  // Three in a row: wickets by one bowler, or fours / sixes by one batter. Gets the full hat-trick treatment.
  hatTrick?: boolean
  // A batter out for nought: the duck animation replaces the plain OUT!
  duck?: 'Duck' | 'Golden' | 'Diamond'
  // Who it is for, shown under the word on a hat-trick (the bowler for wickets, the batter for boundaries).
  who?: string
}

const TRIGGERS: ReadonlySet<string> = new Set<BurstKind>(['Four', 'Six', 'Wicket', 'NoBall', 'Wide'])
const TITLES: Record<BurstKind, string> = { Four: 'FOUR', Six: 'SIX', Wicket: 'OUT!', NoBall: 'NO BALL', Wide: 'WIDE', Penalty: 'PENALTY', PowerSurge: 'POWER SURGE' }

// Penalty runs are not a ball, so they have their own announcement (state.lastPenalty). The amount sits ABOVE the word.
export function describePenalty(state: MatchState): Burst | null {
  const p = state.lastPenalty
  if (!p || p.runs <= 0) return null
  return { id: p.id, kind: 'Penalty', title: TITLES.Penalty, tag: `+${p.runs} ${p.runs === 1 ? 'RUN' : 'RUNS'}` }
}

// The batting side has taken its Power Surge: announced once, when it becomes active (state.innings.powerSurge).
export function describePowerSurge(state: MatchState): Burst | null {
  const inn = state.innings
  const ps = inn?.powerSurge
  if (!inn || !ps?.active) return null
  return { id: `surge:${inn.inningsId}:${ps.startOver}`, kind: 'PowerSurge', title: TITLES.PowerSurge, tag: `${ps.overs} OVERS OF FIELD RESTRICTIONS` }
}

// Turns the server's last ball into the animation (null = nothing to show).
// The burst is the highlighted word: no batter, bowler, score or extras under it (the scorebug already carries those).
// The one exception is the free-hit warning after a no-ball, which goes on TOP of the word, not under it.
export function describeBurst(state: MatchState): Burst | null {
  const ball = state.lastBall
  if (!ball || !TRIGGERS.has(ball.kind)) return null
  const kind = ball.kind as BurstKind
  const burst: Burst = { id: ball.ballId, kind, title: TITLES[kind] }
  const streak = ball.sixStreak ?? 0
  if (kind === 'Six' && streak >= 2) Object.assign(burst, { title: 'SIXES', tag: streak === 2 ? 'BACK-TO-BACK' : `${streak} IN A ROW`, streak })
  const inn = state.innings
  // hat-tricks (exactly three; a fourth in a row falls back to the normal streak wording)
  if (kind === 'Six' && streak === 3) Object.assign(burst, { title: 'SIXES', tag: 'HAT-TRICK OF', hatTrick: true, who: inn?.striker?.name ?? '' })
  if (kind === 'Four' && (ball.fourStreak ?? 0) === 3) Object.assign(burst, { title: 'FOURS', tag: 'HAT-TRICK OF', hatTrick: true, streak: 3, who: inn?.striker?.name ?? '' })
  if (kind === 'Wicket' && (ball.wicketStreak ?? 0) === 3) Object.assign(burst, { title: 'HAT-TRICK!', tag: 'WICKETS', hatTrick: true, streak: 3, who: inn?.bowler?.name ?? '' })
  if (kind === 'Wicket' && (ball.wicketStreak ?? 0) === 2) burst.tag = 'ON A HAT-TRICK'
  // out for nought (a hat-trick keeps its own look)
  if (kind === 'Wicket' && ball.duckType && !burst.hatTrick) {
    const title = ball.duckType === 'Golden' ? 'GOLDEN DUCK!' : ball.duckType === 'Diamond' ? 'DIAMOND DUCK!' : 'DUCK!'
    const tag = ball.duckType === 'Golden' ? 'OUT FIRST BALL' : ball.duckType === 'Diamond' ? 'OUT WITHOUT FACING A BALL' : 'OUT FOR NOUGHT'
    Object.assign(burst, { title, tag, duck: ball.duckType, who: ball.duckName ?? '' })
  }
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


// Full-screen hat-trick: three big badges, "HAT-TRICK OF" over the word, and who did it. Colours follow the kind.
const HAT: Record<string, { from: string; via: string; ray: string; text: string; shadow: string; glow: string; badge: string; badgeText: string }> = {
  Six: { from: '#3b0764', via: '#7e22ce', ray: 'rgba(253,224,71,.95)', text: '#fde047', shadow: '#581c87', glow: 'rgba(250,204,21,.95)', badge: '6', badgeText: '#581c87' },
  Four: { from: '#052e16', via: '#16a34a', ray: 'rgba(187,247,208,.9)', text: '#fff', shadow: '#14532d', glow: 'rgba(74,222,128,.95)', badge: '4', badgeText: '#14532d' },
  Wicket: { from: '#450a0a', via: '#dc2626', ray: 'rgba(254,202,202,.9)', text: '#fff', shadow: '#7f1d1d', glow: 'rgba(252,165,165,.95)', badge: 'W', badgeText: '#7f1d1d' },
}

function HatTrickView({ burst, ms }: { burst: Burst; ms: number }) {
  const c = HAT[burst.kind] ?? HAT.Six!
  return (
    <>
      <div style={{ position: 'absolute', left: 960 - 900, top: middle(STRIPE.main) - 900, width: 1800, height: 1800, borderRadius: '50%', background: `repeating-conic-gradient(${c.ray} 0 6deg, transparent 6deg 18deg)`, WebkitMaskImage: 'radial-gradient(circle, #000 12%, transparent 66%)', maskImage: 'radial-gradient(circle, #000 12%, transparent 66%)', animation: 'ev-rays 2.4s ease-out both' }} />
      <Stripe from={c.from} via={c.via} geo={STRIPE.main} ms={ms} />
      <Band geo={STRIPE.main}>
        <div data-testid="hat-trick" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: `ev-pop-shake ${ms}ms ease-out both` }}>
          <div style={{ display: 'flex', gap: 18 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} data-hat-badge style={{ width: 74, height: 74, borderRadius: '50%', display: 'grid', placeItems: 'center', fontFamily: font, fontWeight: 700, fontSize: 48, lineHeight: 1, color: c.badgeText, background: 'radial-gradient(circle at 30% 30%, #fff, #fde047 60%, #ca8a04)', boxShadow: `0 0 26px ${c.glow}`, animation: `ev-sub ${ms}ms ease-out ${0.2 + i * 0.28}s both` }}>{c.badge}</span>
            ))}
          </div>
          <span style={{ fontFamily: font, fontWeight: 700, fontSize: 54, letterSpacing: 8, lineHeight: 1.1, color: '#1c1917', background: '#fde047', padding: '2px 32px', borderRadius: 8, whiteSpace: 'nowrap' }}>{burst.kind === 'Wicket' ? 'HAT-TRICK FOR' : burst.tag}</span>
          <span style={{ ...title(burst.kind === 'Wicket' ? 150 : 175), color: c.text, textShadow: `0 10px 0 ${c.shadow}, 0 0 60px ${c.glow}` }}>{burst.kind === 'Wicket' ? (burst.who || burst.title) : burst.title}</span>
          {burst.who && burst.kind !== 'Wicket' && <span style={{ fontFamily: font, fontWeight: 600, fontSize: 40, letterSpacing: 6, textTransform: 'uppercase', color: '#fff' }}>{burst.who}</span>}
        </div>
      </Band>
    </>
  )
}

// A cartoon duck, drawn in SVG so it needs no image file.
function Duck({ size = 190 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 100" width={size} height={size * 100 / 120} aria-hidden style={{ filter: 'drop-shadow(0 8px 10px rgba(0,0,0,.5))' }}>
      <ellipse cx="52" cy="62" rx="38" ry="26" fill="#facc15" />
      <path d="M22 56c8-12 26-6 30 8-12 6-26 4-30-8z" fill="#eab308" />
      <circle cx="92" cy="32" r="19" fill="#facc15" />
      <path d="M106 34c14-2 18 4 18 8-4 5-14 5-20 2z" fill="#f97316" />
      <circle cx="96" cy="27" r="3.6" fill="#1c1917" />
      <circle cx="97" cy="26" r="1.1" fill="#fff" />
      <path d="M38 86l-6 10h14zM62 86l-6 10h14z" fill="#f97316" />
    </svg>
  )
}

const DUCK_LOOK = {
  Duck: { from: '#431407', via: '#d97706', text: '#fef3c7', shadow: '#78350f', glow: 'rgba(251,191,36,.9)', ray: 'rgba(253,224,71,.0)' },
  Golden: { from: '#422006', via: '#ca8a04', text: '#fef08a', shadow: '#713f12', glow: 'rgba(250,204,21,.95)', ray: 'rgba(253,224,71,.9)' },
  Diamond: { from: '#082f49', via: '#0891b2', text: '#cffafe', shadow: '#164e63', glow: 'rgba(103,232,249,.95)', ray: 'rgba(165,243,252,.85)' },
} as const

// Out for nought: a duck waddles across a stripe, the word DUCK slams in, and who it was sits underneath.
function DuckView({ burst, ms }: { burst: Burst; ms: number }) {
  const c = DUCK_LOOK[burst.duck ?? 'Duck']
  const rays = burst.duck !== 'Duck'
  return (
    <>
      {rays && <div style={{ position: 'absolute', left: 960 - 800, top: middle(STRIPE.main) - 800, width: 1600, height: 1600, borderRadius: '50%', background: `repeating-conic-gradient(${c.ray} 0 6deg, transparent 6deg 20deg)`, WebkitMaskImage: 'radial-gradient(circle, #000 12%, transparent 66%)', maskImage: 'radial-gradient(circle, #000 12%, transparent 66%)', animation: 'ev-rays 2.2s ease-out both' }} />}
      <Stripe from={c.from} via={c.via} geo={STRIPE.main} ms={ms} />
      <div data-testid="duck-run" style={{ position: 'absolute', left: 0, top: STRIPE.main.top + STRIPE.main.height - 150, animation: 'duck-run 2.6s cubic-bezier(.4,0,.6,1) .35s both', zIndex: 2 }}>
        <div style={{ animation: 'duck-hop .38s ease-in-out infinite' }}><Duck /></div>
      </div>
      <Band geo={STRIPE.main}>
        <div data-testid="duck-out" data-duck={burst.duck} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animation: `ev-pop-shake ${ms}ms ease-out both` }}>
          {burst.tag && <span style={{ fontFamily: font, fontWeight: 700, fontSize: 48, letterSpacing: 7, lineHeight: 1.1, color: '#1c1917', background: '#fde047', padding: '2px 28px', borderRadius: 8, whiteSpace: 'nowrap' }}>{burst.tag}</span>}
          <span style={{ ...title(burst.title.length > 8 ? 190 : 260), color: c.text, textShadow: `0 10px 0 ${c.shadow}, 0 0 60px ${c.glow}` }}>{burst.title}</span>
          {burst.who && <span style={{ fontFamily: font, fontWeight: 600, fontSize: 40, letterSpacing: 6, textTransform: 'uppercase', color: '#fff' }}>{burst.who}</span>}
        </div>
      </Band>
    </>
  )
}

function BurstView({ burst, ms }: { burst: Burst; ms: number }) {
  const { kind } = burst
  const word = burst.title
  if (burst.hatTrick) return <HatTrickView burst={burst} ms={ms} />
  if (burst.duck) return <DuckView burst={burst} ms={ms} />

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
  if (kind === 'Six' && (burst.streak ?? 0) >= 2) {
    // sixes in a row: hotter colours, a row of 6 badges (one per six), the count as a tag above SIXES
    const n = burst.streak!
    return (
      <>
        <div style={{ position: 'absolute', left: 960 - 800, top: middle(STRIPE.main) - 800, width: 1600, height: 1600, borderRadius: '50%', background: 'repeating-conic-gradient(rgba(251,146,60,.95) 0 7deg, transparent 7deg 22deg)', WebkitMaskImage: 'radial-gradient(circle, #000 12%, transparent 68%)', maskImage: 'radial-gradient(circle, #000 12%, transparent 68%)', animation: 'ev-rays 2.2s ease-out both' }} />
        <Stripe from="#431407" via="#c2410c" geo={STRIPE.main} ms={ms} />
        <Band geo={STRIPE.main}>
          <div data-testid="six-streak" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, animation: `ev-pop-shake ${ms}ms ease-out both` }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {Array.from({ length: Math.min(n, 10) }, (_, i) => (
                <span key={i} style={{ width: 62, height: 62, borderRadius: '50%', display: 'grid', placeItems: 'center', fontFamily: font, fontWeight: 700, fontSize: 40, lineHeight: 1, color: '#7c2d12', background: 'radial-gradient(circle at 30% 30%, #fef9c3, #facc15 60%, #ca8a04)', boxShadow: '0 0 22px rgba(253,224,71,.9)', animation: `ev-sub ${ms}ms ease-out ${0.15 + i * 0.12}s both` }}>6</span>
              ))}
            </div>
            <span style={{ fontFamily: font, fontWeight: 700, fontSize: 54, letterSpacing: 8, lineHeight: 1.1, color: '#7c2d12', background: '#fde047', padding: '2px 30px', borderRadius: 8, whiteSpace: 'nowrap' }}>{burst.tag}</span>
            <span style={{ ...title(190), color: '#fde047', textShadow: '0 10px 0 #7c2d12, 0 0 60px rgba(251,146,60,.95)' }}>{word}</span>
          </div>
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
  if (kind === 'PowerSurge') {
    // electric violet stripe, a lightning bolt either side of the words, the length as a tag
    const bolt = (flip: boolean) => (
      <svg viewBox="0 0 24 24" width="150" height="150" aria-hidden style={{ transform: flip ? 'scaleX(-1)' : undefined, filter: 'drop-shadow(0 0 26px rgba(250,204,21,.95))', animation: `ev-pop-shake ${ms}ms ease-out both` }}>
        <path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="#fde047" stroke="#facc15" strokeWidth="0.6" strokeLinejoin="round" />
      </svg>
    )
    return (
      <>
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 240px 60px rgba(124,58,237,.85)', animation: 'ev-vignette 1.8s ease-out both' }} />
        <Stripe from="#2e1065" via="#7c3aed" geo={STRIPE.main} ms={ms} />
        <Band geo={STRIPE.main}>
          <div data-testid="power-surge-burst" style={{ display: 'flex', alignItems: 'center', gap: 40, animation: `ev-pop-shake ${ms}ms ease-out both` }}>
            {bolt(false)}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              {burst.tag && <span style={{ fontFamily: font, fontWeight: 700, fontSize: 46, letterSpacing: 6, lineHeight: 1.1, color: '#2e1065', background: '#fde047', padding: '2px 26px', borderRadius: 8, whiteSpace: 'nowrap' }}>{burst.tag}</span>}
              <span style={{ ...title(210), color: '#fff', textShadow: '0 10px 0 #4c1d95, 0 0 60px rgba(196,181,253,.95)' }}>{word}</span>
            </div>
            {bolt(true)}
          </div>
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
  const surge = describePowerSurge(state)
  const surgeId = surge?.id ?? null
  const seenSurges = useRef<Set<string> | null>(null)
  seenSurges.current ??= new Set(surgeId ? [surgeId] : [])
  seenBalls.current ??= new Set(ballId ? [ballId] : [])
  seenPenalties.current ??= new Set(penaltyId ? [penaltyId] : [])
  const [burst, setBurst] = useState<Burst | null>(null)

  useEffect(() => {
    // a NEW penalty award or a NEW ball starts a burst; what was already on the board at load, or comes back after an undo, does not
    const newPenalty = !!penaltyId && !seenPenalties.current!.has(penaltyId)
    const newBall = !!ballId && !seenBalls.current!.has(ballId)
    const newSurge = !!surgeId && !seenSurges.current!.has(surgeId)
    if (surgeId) seenSurges.current!.add(surgeId)
    if (penaltyId) seenPenalties.current!.add(penaltyId)
    if (ballId) seenBalls.current!.add(ballId)
    const next = newSurge ? describePowerSurge(state) : newPenalty ? describePenalty(state) : newBall ? describeBurst(state) : null
    if (!next) return
    if (next.kind === 'NoBall') playSiren()   // a no-ball is announced with a siren as well
    setBurst(next)
    const t = setTimeout(() => setBurst(null), durationMs)
    return () => clearTimeout(t)
    // decided by the ids only; later state versions must not restart it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ballId, penaltyId, surgeId])

  if (!burst) return null
  return (
    <div key={burst.id} data-testid="event-burst" data-kind={burst.kind} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', animation: `ev-fade ${durationMs}ms linear both` }}>
      <BurstView burst={burst} ms={durationMs} />
    </div>
  )
}
