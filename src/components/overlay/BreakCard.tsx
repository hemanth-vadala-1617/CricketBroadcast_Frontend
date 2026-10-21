import { useEffect, useRef, useState } from 'react'
import { CloudRain, Coffee, Droplets, Moon, Stethoscope, Sun, Timer, Users, Utensils, Wrench, type LucideIcon } from 'lucide-react'
import type { MatchBreak, MatchState } from '../../lib/types'
import { breakLook, clockFor } from './breaks'

const ICONS: Record<string, LucideIcon> = {
  StrategicTimeout: Users, DrinksBreak: Droplets, InjuryBreak: Stethoscope, RainDelay: CloudRain, BadLight: Sun,
  WetOutfield: Wrench, Lunch: Utensils, Tea: Coffee, Stumps: Moon, Other: Timer,
}

/** Seconds the current break has lasted: the server's figure when this state was built, plus the time since this page received it. No clock-skew between devices. */
export function useBreakSeconds(brk: MatchBreak | null | undefined): number {
  const received = useRef({ at: Date.now(), key: '' })
  const key = brk ? `${brk.kind}:${brk.elapsedSeconds}:${brk.plannedSeconds}` : ''
  if (received.current.key !== key) received.current = { at: Date.now(), key }
  const [, tick] = useState(0)
  useEffect(() => {
    if (!brk) return
    const t = window.setInterval(() => tick((n) => n + 1), 1000)
    return () => window.clearInterval(t)
  }, [brk])
  return brk ? brk.elapsedSeconds + (Date.now() - received.current.at) / 1000 : 0
}

/** The stoppage card: what it is, a countdown (or a count-up when it has no fixed length), and the score to come back to. */
export function BreakCard({ state, brk }: { state: MatchState; brk: MatchBreak }) {
  const look = breakLook(brk.kind, brk.label)
  const Icon = ICONS[brk.kind] ?? Timer
  const seconds = useBreakSeconds(brk)
  const clock = clockFor(brk, seconds)
  const inn = state.innings
  return (
    <div data-testid="break-card" data-kind={brk.kind} className="anim-pop" style={{ position: 'absolute', left: 420, top: 340, width: 1080, borderRadius: 28, background: `linear-gradient(160deg, ${look.dark}f2, rgba(8,12,20,.94))`, border: `4px solid ${look.accent}`, padding: '34px 52px 38px', textAlign: 'center', color: '#fff', boxShadow: '0 24px 70px rgba(0,0,0,.6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        <span style={{ animation: 'break-icon 2.4s ease-in-out infinite', display: 'grid', placeItems: 'center', width: 120, height: 120, borderRadius: '50%', background: `${look.accent}26`, border: `3px solid ${look.accent}` }}>
          <Icon size={72} color={look.accent} strokeWidth={1.8} aria-hidden />
        </span>
        <div>
          <div className="font-display" style={{ fontSize: 78, fontWeight: 700, letterSpacing: 5, color: look.accent, textTransform: 'uppercase', lineHeight: 1.05 }}>{look.title}</div>
          <div className="font-display" style={{ fontSize: 34, fontWeight: 500, letterSpacing: 2, opacity: 0.9 }}>{look.subtitle}</div>
        </div>
      </div>
      <div style={{ marginTop: 22, display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 22 }}>
        <span data-testid="break-clock" className="font-display" style={{ fontSize: 120, fontWeight: 700, lineHeight: 1, color: clock.overrun ? '#f87171' : '#fff', fontVariantNumeric: 'tabular-nums' }}>{clock.text}</span>
        <span className="font-display" style={{ fontSize: 32, letterSpacing: 4, color: look.accent }}>{clock.label}</span>
      </div>
      {inn && (
        <div className="font-display" style={{ marginTop: 16, fontSize: 40, fontWeight: 500, opacity: 0.95 }}>
          {`${inn.battingTeam.name} ${inn.runs}-${inn.wickets} (${inn.overs})`}
        </div>
      )}
    </div>
  )
}
