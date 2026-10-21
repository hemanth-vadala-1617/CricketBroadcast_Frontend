import { useEffect, useRef, useState } from 'react'
import type { MatchState } from '../../lib/types'

/** How long DEAD BALL stays on air. */
export const DEAD_BALL_MS = 3500

/** True for a few seconds after the umpire calls dead ball (the innings' dead-ball count goes up). A count already there on load never shows. */
export function useDeadBall(state: MatchState, enabled: boolean): boolean {
  const inningsId = state.innings?.inningsId
  const count = state.innings?.deadBalls ?? 0
  const seen = useRef({ inningsId, count })
  const [show, setShow] = useState(false)
  useEffect(() => {
    const prev = seen.current
    seen.current = { inningsId, count }
    if (prev.inningsId !== inningsId || count <= prev.count || !enabled) return
    setShow(true)
    const t = window.setTimeout(() => setShow(false), DEAD_BALL_MS)
    return () => window.clearTimeout(t)
  }, [inningsId, count, enabled])
  return show
}

export function DeadBallFlash() {
  return (
    <div data-testid="dead-ball" className="font-display anim-flash" style={{
      position: 'absolute', left: '50%', top: 250, transform: 'translateX(-50%)', padding: '14px 56px', borderRadius: 14,
      background: 'linear-gradient(180deg, #ef4444, #991b1b)', color: '#fff', fontSize: 76, fontWeight: 800, letterSpacing: 8,
      textTransform: 'uppercase', boxShadow: '0 14px 34px rgba(0,0,0,.55)', border: '4px solid #fecaca',
    }}>DEAD BALL</div>
  )
}
