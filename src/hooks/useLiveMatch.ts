import { useEffect } from 'react'
import { acquireMatch, releaseMatch, useLiveStore } from '../lib/liveMatch'

/** Subscribes this screen to one match; returns the latest versioned state. */
export function useLiveMatch(matchId: string | undefined) {
  useEffect(() => {
    if (!matchId) return
    acquireMatch(matchId)
    return () => releaseMatch()
  }, [matchId])

  const state = useLiveStore((s) => (s.state && s.state.matchId === matchId ? s.state : null))
  const status = useLiveStore((s) => s.status)
  const apply = useLiveStore((s) => s.apply)
  return { state, status, apply }
}
