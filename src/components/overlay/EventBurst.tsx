import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { MatchState } from '../../lib/types'

/** How long a burst stays on air. */
export const EVENT_MS = 3800

export type BurstKind = 'Four' | 'Six' | 'Wicket' | 'NoBall' | 'Wide'

export interface Burst {
  id: string
  kind: BurstKind
  title: string
  lines: string[]
}

const TRIGGERS: ReadonlySet<string> = new Set<BurstKind>(['Four', 'Six', 'Wicket', 'NoBall', 'Wide'])

/** Turns the server's last ball into the text of the TV-style animation (null = nothing to show). */
export function describeBurst(state: MatchState): Burst | null {
  const ball = state.lastBall
  const inn = state.innings
  if (!ball || !TRIGGERS.has(ball.kind)) return null
  const kind = ball.kind as BurstKind
  const score = inn ? `${inn.battingTeam.shortName} ${inn.runs}-${inn.wickets}` : ''

  switch (kind) {
    case 'Four': return { id: ball.ballId, kind, title: 'FOUR', lines: [score] }
    case 'Six': return { id: ball.ballId, kind, title: 'SIX', lines: [score] }
    case 'Wicket': {
      const card = state.scorecard.at(-1)
      const out = card?.fallOfWickets.at(-1)
      const line = out ? card?.batting.find((b) => b.name === out.batterName && b.status === 'out') : undefined
      return {
        id: ball.ballId, kind, title: 'OUT!',
        lines: [out ? `${out.batterName}${line ? `  ${line.runs} (${line.balls})` : ''}` : '', line?.dismissalText ?? '', score].filter(Boolean),
      }
    }
    case 'NoBall': return { id: ball.ballId, kind, title: 'NO BALL', lines: [inn?.freeHit ? 'FREE HIT NEXT BALL' : '', score].filter(Boolean) }
    case 'Wide': {
      const more = /\+(\d+)/.exec(ball.label)?.[1]
      return { id: ball.ballId, kind, title: 'WIDE', lines: [more ? `+${more} runs` : '', score].filter(Boolean) }
    }
  }
}

const font = 'var(--font-display)'
const centre: CSSProperties = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'grid', placeItems: 'center' }

function Stripe({ from, via, top = 330, height = 330, ms }: { from: string; via: string; top?: number; height?: number; ms: number }) {
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, top, height,
      background: `linear-gradient(90deg, ${from}, ${via} 30%, ${via} 70%, ${from})`,
      boxShadow: '0 0 60px rgba(0,0,0,.55)', transformOrigin: 'center', animation: `ev-stripe ${ms}ms ease-out both`,
    }} />
  )
}

function SubLines({ lines, ms, color = '#fff' }: { lines: string[]; ms: number; color?: string }) {
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', fontFamily: font, color, animation: `ev-sub ${ms}ms ease-out both` }}>
      {lines.map((l, i) => (
        <div key={i} style={{ fontSize: i === 0 ? 58 : 40, fontWeight: i === 0 ? 700 : 500, letterSpacing: 2, textShadow: '0 4px 12px rgba(0,0,0,.8)', textTransform: i === 0 ? 'uppercase' : 'none' }}>{l}</div>
      ))}
    </div>
  )
}

function Ball({ delay = 0.15 }: { delay?: number }) {
  return (
    <div style={{
      position: 'absolute', top: 440, left: 0, width: 74, height: 74, borderRadius: '50%',
      background: 'radial-gradient(circle at 30% 30%, #fca5a5, #dc2626 55%, #7f1d1d)', boxShadow: '0 0 30px rgba(255,255,255,.7)',
      animation: `ev-ball-run 1.35s cubic-bezier(.45,0,.9,.55) ${delay}s both`,
    }} />
  )
}

function Stumps() {
  const bars = [{ dx: -260, rot: -62 }, { dx: 40, rot: 14 }, { dx: 300, rot: 70 }]
  return (
    <div style={{ position: 'absolute', left: 1330, top: 380, width: 200, height: 230 }}>
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
  const { kind, title, lines } = burst
  const textBase: CSSProperties = { fontFamily: font, fontWeight: 700, lineHeight: 1, whiteSpace: 'nowrap' }

  if (kind === 'Four') {
    return (
      <>
        <Stripe from="#052e16" via="#16a34a" ms={ms} />
        <Ball />
        <div style={centre}>
          <span style={{ ...textBase, fontSize: 300, fontStyle: 'italic', color: '#fff', textShadow: '0 10px 0 #14532d, 0 0 50px rgba(74,222,128,.95)', animation: `ev-text-left ${ms}ms ease-out both` }}>{title}</span>
        </div>
        <SubLines lines={lines} ms={ms} />
      </>
    )
  }
  if (kind === 'Six') {
    return (
      <>
        <div style={{ position: 'absolute', left: 960 - 800, top: 500 - 800, width: 1600, height: 1600, borderRadius: '50%', background: 'repeating-conic-gradient(rgba(253,224,71,.95) 0 7deg, transparent 7deg 22deg)', WebkitMaskImage: 'radial-gradient(circle, #000 12%, transparent 68%)', maskImage: 'radial-gradient(circle, #000 12%, transparent 68%)', animation: 'ev-rays 1.9s ease-out both' }} />
        <Stripe from="#3b0764" via="#7e22ce" ms={ms} />
        <div style={centre}>
          <span style={{ ...textBase, fontSize: 380, color: '#fde047', textShadow: '0 12px 0 #581c87, 0 0 60px rgba(250,204,21,.95)', animation: `ev-pop-shake ${ms}ms ease-out both` }}>{title}</span>
        </div>
        <SubLines lines={lines} ms={ms} color="#fde047" />
      </>
    )
  }
  if (kind === 'Wicket') {
    return (
      <>
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 260px 70px rgba(220,38,38,.95)', animation: 'ev-vignette 1.8s ease-out both' }} />
        <Stripe from="#450a0a" via="#dc2626" ms={ms} />
        <Stumps />
        <div style={centre}>
          <span style={{ ...textBase, fontSize: 330, color: '#fff', textShadow: '0 12px 0 #7f1d1d, 0 0 50px rgba(0,0,0,.6)', animation: `ev-slam ${ms}ms ease-out both` }}>{title}</span>
        </div>
        <SubLines lines={lines} ms={ms} />
      </>
    )
  }
  // NoBall / Wide: amber call-out
  return (
    <>
      <Stripe from="#451a03" via="#f59e0b" top={380} height={240} ms={ms} />
      <div style={{ ...centre, top: 40 }}>
        <span style={{ ...textBase, fontSize: 220, color: '#1c1917', textShadow: '0 6px 0 rgba(255,255,255,.35)', animation: `ev-slide-up ${ms}ms ease-out both` }}>{title}</span>
      </div>
      <SubLines lines={lines} ms={ms} color="#fde68a" />
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
  const seen = useRef<Set<string> | null>(null)
  seen.current ??= new Set(ballId ? [ballId] : [])
  const [burst, setBurst] = useState<Burst | null>(null)

  useEffect(() => {
    if (!ballId || seen.current!.has(ballId)) return
    seen.current!.add(ballId)
    const next = describeBurst(state)
    if (!next) return
    setBurst(next)
    const t = setTimeout(() => setBurst(null), durationMs)
    return () => clearTimeout(t)
    // the burst is decided by the ball id only; later state versions must not restart it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ballId])

  if (!burst) return null
  return (
    <div key={burst.id} data-testid="event-burst" data-kind={burst.kind} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', animation: `ev-fade ${durationMs}ms linear both` }}>
      <BurstView burst={burst} ms={durationMs} />
    </div>
  )
}
