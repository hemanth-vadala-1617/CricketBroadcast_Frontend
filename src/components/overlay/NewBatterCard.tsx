import { useEffect, useRef, useState } from 'react'
import type { Batter, BatterCareer, MatchState } from '../../lib/types'
import { assetUrl, initials } from '../../lib/utils'
import { TeamLogo } from './OverlayBits'
import { EVENT_MS } from './EventBurst'
import { NEW_BATTER_MS, NEW_BATTER_SWAP_MS, detectArrival, type BatterWatch, type HeldBatter } from './newBatter'

export interface NewBatterView {
  /** The batter to introduce right now (null most of the time). */
  shown: Batter | null
  /** The batter who left, to keep on his bottom card (marked OUT) until the introduction is over. */
  held: HeldBatter | null
}

/**
 * Watches the match state for a new batter walking in. The introduction waits for the OUT burst to clear after a wicket,
 * then stays NEW_BATTER_MS. The departed batter is held on his bottom card from the moment of the wicket until
 * NEW_BATTER_SWAP_MS after the introduction starts, then the bottom card switches to the new batter.
 */
export function useNewBatter(state: MatchState, enabled: boolean): NewBatterView {
  const watch = useRef<BatterWatch | null>(null)
  const [shown, setShown] = useState<Batter | null>(null)
  const [held, setHeld] = useState<HeldBatter | null>(null)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const next = detectArrival(watch.current, state)
    watch.current = next.watch
    const arrival = next.arrival
    if (!arrival || !enabled) return
    if (arrival.held) setHeld(arrival.held)
    const wait = state.lastBall?.kind === 'Wicket' ? EVENT_MS + 200 : 0
    const start = window.setTimeout(() => {
      setShown(arrival.batter)
      timers.current.push(window.setTimeout(() => setHeld(null), NEW_BATTER_SWAP_MS))
      timers.current.push(window.setTimeout(() => setShown(null), NEW_BATTER_MS))
    }, wait)
    timers.current.push(start)
  }, [state, enabled])

  useEffect(() => () => { timers.current.forEach(window.clearTimeout) }, [])
  return { shown, held }
}

const fmt = (n: number | null, digits = 0) => (n === null || n === undefined ? null : digits ? n.toFixed(digits) : String(n))

function careerRows(c: BatterCareer): [string, string][] {
  const rows: [string, string | null][] = [
    ['MATCHES', fmt(c.matches)], ['RUNS', fmt(c.runs)], ['AVERAGE', fmt(c.average, 2)], ['STRIKE RATE', fmt(c.strikeRate, 1)],
    ['50s / 100s', c.fifties === null && c.hundreds === null ? null : `${c.fifties ?? 0} / ${c.hundreds ?? 0}`],
  ]
  return rows.filter((r): r is [string, string] => r[1] !== null)
}

const CARD_W = 560

/** "Next batter" introduction: photo, shirt number, name plate and (when entered) career figures. */
export function NewBatterCard({ batter, state }: { batter: Batter; state: MatchState }) {
  const { theme } = state
  const team = state.innings!.battingTeam
  const photo = assetUrl(batter.photoUrl)
  const first = (batter.firstName ?? '').trim()
  const last = (batter.lastName ?? '').trim()
  const parts = batter.name.trim().split(/\s+/)
  const firstLine = first || last ? (last ? first : '') : parts.slice(0, -1).join(' ')
  const lastLine = first || last ? (last || first) : (parts.at(-1) ?? '')
  const career = batter.career ?? null
  const rows = career ? careerRows(career) : []
  const gold = theme.accentColor
  return (
    <div data-testid="new-batter-card" style={{ position: 'absolute', left: 60, top: 170, width: CARD_W, color: '#fff', animation: `new-batter-in ${NEW_BATTER_MS}ms cubic-bezier(.2,.9,.3,1) both`, filter: 'drop-shadow(0 18px 34px rgba(0,0,0,.6))' }}>
      <div style={{ clipPath: 'polygon(0 0, 100% 0, 96% 100%, 0 100%)', background: `linear-gradient(160deg, color-mix(in srgb, ${theme.primaryColor} 55%, #04102e), #04102e 70%)`, border: `3px solid ${gold}` }}>
        <div style={{ position: 'relative', height: 330, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 18, top: 16, zIndex: 2 }}><TeamLogo team={team} size={84} /></div>
          {(batter.jerseyNumber ?? 0) > 0 && (
            <span className="font-display" style={{ position: 'absolute', right: 26, top: 0, fontSize: 250, fontWeight: 700, lineHeight: 1, color: 'transparent', WebkitTextStroke: `3px ${gold}`, opacity: 0.55 }}>{batter.jerseyNumber}</span>
          )}
          {photo
            ? <img src={photo} alt="" style={{ position: 'absolute', left: 90, bottom: 0, height: 330, objectFit: 'contain', objectPosition: 'bottom left' }} />
            : <span className="font-display" style={{ position: 'absolute', left: 130, bottom: 30, fontSize: 150, fontWeight: 700, color: 'rgba(255,255,255,.3)' }}>{initials(batter.name)}</span>}
          <span className="font-display" style={{ position: 'absolute', right: 18, bottom: 14, padding: '2px 14px', background: gold, color: '#000', fontSize: 26, fontWeight: 700, letterSpacing: 3 }}>NEW BATTER</span>
        </div>
        <div className="font-display" style={{ padding: '12px 22px 10px', background: 'linear-gradient(90deg, rgba(255,255,255,.12), transparent)', borderTop: `3px solid ${gold}`, textTransform: 'uppercase', lineHeight: 1.02 }}>
          {firstLine && <div style={{ fontSize: 34, fontWeight: 500, letterSpacing: 2 }}>{firstLine}</div>}
          <div style={{ fontSize: 60, fontWeight: 700, letterSpacing: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastLine}</div>
          {batter.battingStyle && <span style={{ display: 'inline-block', marginTop: 6, padding: '1px 14px', background: gold, color: '#000', fontSize: 22, fontWeight: 700, letterSpacing: 2, borderRadius: 4 }}>{batter.battingStyle}</span>}
        </div>
        {rows.length > 0 && (
          <div className="font-display" style={{ padding: '10px 22px 18px' }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: 2, color: gold, marginBottom: 4 }}>{(career?.label || 'CAREER').toUpperCase()}{career?.label ? ' CAREER' : ''}</div>
            {rows.map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 28, fontWeight: 500, borderTop: '1px solid rgba(255,255,255,.28)', padding: '3px 0' }}>
                <span>{label}</span><span style={{ fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
