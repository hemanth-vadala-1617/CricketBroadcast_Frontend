import { useEffect, useRef, useState } from 'react'
import type { MatchState, Milestone } from '../../lib/types'
import { assetUrl, initials } from '../../lib/utils'
import { EVENT_MS } from './EventBurst'
import { MILESTONE_MS, describeMilestone, freshMilestones } from './milestone'

/**
 * Plays each NEW milestone (fifty, hundred, maiden, five-for) once, one after another if several arrive together.
 * Waits for the FOUR / SIX / OUT burst to clear first. Nothing replays on page load.
 */
export function useMilestones(state: MatchState, enabled: boolean): Milestone | null {
  const seen = useRef<Set<string> | null>(null)
  seen.current ??= new Set((state.milestones ?? []).map((m) => m.id))
  const queue = useRef<Milestone[]>([])
  const busy = useRef(false)
  const timers = useRef<number[]>([])
  const [shown, setShown] = useState<Milestone | null>(null)

  const next = useRef<() => void>(() => {})
  next.current = () => {
    const m = queue.current.shift()
    if (!m) { busy.current = false; setShown(null); return }
    busy.current = true
    setShown(m)
    timers.current.push(window.setTimeout(() => next.current(), MILESTONE_MS))
  }

  useEffect(() => {
    const fresh = freshMilestones(state, seen.current!)
    if (fresh.length === 0) return
    fresh.forEach((m) => seen.current!.add(m.id))
    if (!enabled) return
    queue.current.push(...fresh)
    if (busy.current) return
    busy.current = true   // claimed while we wait for the burst to clear
    const k = state.lastBall?.kind
    const wait = k === 'Four' || k === 'Six' || k === 'Wicket' ? EVENT_MS + 200 : 600
    timers.current.push(window.setTimeout(() => next.current(), wait))
  }, [state, enabled])

  useEffect(() => () => { timers.current.forEach(window.clearTimeout) }, [])
  return shown
}

const TIER = {
  silver: { dark: '#0f172a', mid: '#475569', light: '#e2e8f0' },
  gold: { dark: '#422006', mid: '#a16207', light: '#fde047' },
  purple: { dark: '#3b0764', mid: '#a21caf', light: '#fde047' },
  green: { dark: '#052e16', mid: '#15803d', light: '#bbf7d0' },
  red: { dark: '#450a0a', mid: '#b91c1c', light: '#fecaca' },
  orange: { dark: '#431407', mid: '#c2410c', light: '#fed7aa' },
} as const

/** Right-hand milestone card: photo, the milestone in big letters, the name and the figures. */
export function MilestoneCard({ milestone }: { milestone: Milestone }) {
  const v = describeMilestone(milestone)
  const c = TIER[v.tier]
  const photo = assetUrl(milestone.photoUrl)
  return (
    <div data-testid="milestone-card" data-kind={milestone.kind} data-tier={v.tier} style={{ position: 'absolute', right: 40, top: 200, width: 620, color: '#fff', animation: `ms-in ${MILESTONE_MS}ms cubic-bezier(.2,.9,.3,1) both`, filter: 'drop-shadow(0 16px 30px rgba(0,0,0,.6))' }}>
      <div style={{ clipPath: 'polygon(4% 0, 100% 0, 100% 100%, 0 100%)', background: `linear-gradient(120deg, ${c.dark}, ${c.mid} 60%, ${c.dark})`, borderBottom: `6px solid ${c.light}`, padding: '20px 26px 20px 170px', minHeight: 230, position: 'relative' }}>
        <div style={{ position: 'absolute', left: 22, top: 22, width: 130, height: 190, overflow: 'hidden', background: `linear-gradient(180deg, ${c.light}, ${c.mid})`, borderRadius: 10, display: 'grid', placeItems: photo ? undefined : 'center' }}>
          {photo ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
            : <span className="font-display" style={{ fontSize: 56, fontWeight: 700, color: 'rgba(255,255,255,.8)' }}>{initials(milestone.name)}</span>}
        </div>
        <div className="font-display" style={{ lineHeight: 1.02, textTransform: 'uppercase' }}>
          {(milestone.kind === 'FourWickets' || milestone.kind === 'FiveWickets') && (
            <div data-testid="wicket-badges" style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
              {Array.from({ length: milestone.value }, (_, i) => (
                <span key={i} data-wicket-badge style={{ width: 46, height: 46, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 28, fontWeight: 700, color: '#7f1d1d', background: 'radial-gradient(circle at 30% 30%, #fff, #fde047 60%, #ca8a04)', boxShadow: '0 0 18px rgba(253,224,71,.8)', animation: `ev-sub ${MILESTONE_MS}ms ease-out ${0.5 + i * 0.22}s both` }}>W</span>
              ))}
            </div>
          )}
          <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: 5, color: c.light }}>{v.sub}</div>
          <div style={{ fontSize: v.title.length > 10 ? 58 : 84, fontWeight: 700, textShadow: `0 6px 0 ${c.dark}` }}>{v.title}</div>
          <div style={{ fontSize: 36, fontWeight: 600, letterSpacing: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{milestone.name}</div>
          <div style={{ fontSize: 32, fontWeight: 500, letterSpacing: 2, color: c.light }}>{milestone.detail}</div>
        </div>
      </div>
    </div>
  )
}
