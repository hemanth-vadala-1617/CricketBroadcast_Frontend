import { useCallback, useRef, useState } from 'react'
import { api, ApiError, errorMessage } from '../../lib/api'
import { newId } from '../../lib/utils'
import { toast } from '../../store/useToast'
import type { MatchState } from '../../lib/types'
import { buildBall, createIdempotency, type Outcome, type PadAction } from './buildRequest'

export interface InningsStartInput { battingTeamId?: string | null; strikerId: string; nonStrikerId: string; bowlerId: string }
export interface CompleteInput { resultType: 'Win' | 'Tie' | 'Draw' | 'NoResult' | 'Abandoned'; winnerTeamId?: string | null; resultText?: string | null }

/** All scorer commands. One request at a time (no double-scoring); every command returns the new state. */
export function useScorer(matchId: string, apply: (s: MatchState) => void) {
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const keys = useRef(createIdempotency(newId))

  const run = useCallback(async (fn: () => Promise<MatchState>): Promise<Outcome> => {
    if (lock.current) return 'rejected'
    lock.current = true; setBusy(true)
    try {
      apply(await fn())
      return 'ok'
    } catch (e) {
      toast.error(errorMessage(e))
      return e instanceof ApiError && e.status === 0 ? 'network' : 'rejected'
    } finally { lock.current = false; setBusy(false) }
  }, [apply])

  const m = `/api/matches/${matchId}`
  const sc = `/api/scoring/match/${matchId}`
  const rv = `/api/revisions/match/${matchId}`

  const withKey = useCallback(async (signature: string, call: (id: string) => Promise<MatchState>) => {
    const id = keys.current.idFor(signature)
    const outcome = await run(() => call(id))
    keys.current.settle(signature, outcome)
    return outcome
  }, [run])

  return {
    busy,
    score: (a: PadAction) => withKey(JSON.stringify(a), (id) => api.post<MatchState>(`${sc}/ball`, buildBall(a, id))),
    editLast: (a: PadAction, reason: string) =>
      withKey(`edit:${reason}:${JSON.stringify(a)}`, (id) => api.put<MatchState>(`${rv}/last-ball`, { reason, ball: buildBall(a, id) })),
    undo: (reason: string) => run(() => api.post<MatchState>(`${rv}/undo`, { reason })),
    swapStrike: () => run(() => api.post<MatchState>(`${sc}/swap-strike`)),
    newBatter: (playerId: string) => run(() => api.post<MatchState>(`${sc}/new-batter`, { playerId })),
    newBowler: (playerId: string, replaceMidOver = false) => run(() => api.post<MatchState>(`${sc}/new-bowler`, { playerId, replaceMidOver })),
    retire: (playerId: string, newBatterId: string | null, reason: string) =>
      run(() => api.post<MatchState>(`${sc}/retire`, { playerId, newBatterId, reason })),
    penalty: (runs: number, reason: string) => run(() => api.post<MatchState>(`${sc}/penalty`, { runs, reason })),
    cancelInnings: () => run(() => api.post<MatchState>(`${rv}/cancel-innings`)),
    startMatch: () => run(() => api.post<MatchState>(`${m}/start`)),
    startInnings: (i: InningsStartInput) => run(() => api.post<MatchState>(`${m}/innings/start`, i)),
    endInnings: (declared: boolean) => run(() => api.post<MatchState>(`${m}/innings/end`, { declared })),
    complete: (c: CompleteInput) => run(() => api.post<MatchState>(`${m}/complete`, c)),
    pause: (rain: boolean) => run(() => api.post<MatchState>(`${m}/pause?rain=${rain}`)),
    resume: () => run(() => api.post<MatchState>(`${m}/resume`)),
    advanceSession: () => run(() => api.post<MatchState>(`${m}/clock/advance`)),
    oversLost: (overs: number) => run(() => api.put<MatchState>(`${m}/clock/overs-lost`, { overs })),
  }
}
export type Scorer = ReturnType<typeof useScorer>
