import * as signalR from '@microsoft/signalr'
import { create } from 'zustand'
import { API_URL } from './utils'
import type { MatchState } from './types'

export type LiveStatus = 'idle' | 'connecting' | 'live' | 'reconnecting' | 'offline' | 'notfound'

interface LiveStore {
  matchId: string | null
  state: MatchState | null
  status: LiveStatus
  /** Applies a state from the hub OR from a REST response; stale versions are ignored. */
  apply: (s: MatchState) => void
}

/** Pure so it can be unit-tested: a state is accepted when it is for another match or strictly newer. */
export function shouldAccept(current: MatchState | null, incoming: MatchState): boolean {
  if (!current || current.matchId !== incoming.matchId) return true
  return incoming.version > current.version
}

export const useLiveStore = create<LiveStore>((set, get) => ({
  matchId: null,
  state: null,
  status: 'idle',
  apply: (s) => { if (shouldAccept(get().state, s)) set({ state: s }) },
}))

// ---- one shared connection, reference counted (React StrictMode mounts effects twice in dev) ----
let connection: signalR.HubConnection | null = null
let refs = 0
let stopTimer: ReturnType<typeof setTimeout> | undefined
let resyncTimer: ReturnType<typeof setInterval> | undefined
let currentMatch: string | null = null

async function fetchState(matchId: string): Promise<MatchState | null> {
  try {
    const res = await fetch(`${API_URL}/api/public/matches/${matchId}/state`)
    if (res.status === 404 && currentMatch === matchId) useLiveStore.setState({ status: 'notfound' })
    return res.ok ? ((await res.json()) as MatchState) : null
  } catch { return null }
}

async function join(matchId: string) {
  if (!connection) return
  // The hub replies to JoinMatch with the current state, so this also resyncs after a reconnect.
  await connection.invoke('JoinMatch', matchId)
  useLiveStore.setState({ status: 'live' })
}

async function start(matchId: string) {
  currentMatch = matchId
  useLiveStore.setState({ matchId, status: 'connecting', ...(useLiveStore.getState().matchId === matchId ? {} : { state: null }) })

  const conn = new signalR.HubConnectionBuilder()
    .withUrl(`${API_URL}/hubs/match`)
    .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
    .configureLogging(signalR.LogLevel.Warning)
    .build()
  connection = conn

  conn.on('MatchStateUpdated', (s: MatchState) => useLiveStore.getState().apply(s))
  conn.onreconnecting(() => useLiveStore.setState({ status: 'reconnecting' }))
  conn.onreconnected(() => { void join(matchId).catch(() => useLiveStore.setState({ status: 'offline' })) })
  conn.onclose(() => { if (connection === conn) useLiveStore.setState({ status: 'offline' }) })

  // HTTP first so the screen is never blank while the socket negotiates.
  void fetchState(matchId).then((s) => { if (s && currentMatch === matchId) useLiveStore.getState().apply(s) })

  try {
    await conn.start()
    if (connection !== conn) return
    await join(matchId)
  } catch (e) {
    // a wrong match id is not a connectivity problem: say so instead of retrying forever
    const missing = e instanceof Error && /match not found/i.test(e.message)
    if (connection === conn) useLiveStore.setState({ status: missing ? 'notfound' : 'offline' })
  }

  // Belt and braces: re-read the state every 30 s so a missed event can never leave the overlay wrong.
  clearInterval(resyncTimer)
  resyncTimer = setInterval(() => {
    void fetchState(matchId).then((s) => { if (s && currentMatch === matchId) useLiveStore.getState().apply(s) })
  }, 30_000)
}

function stop() {
  clearInterval(resyncTimer)
  const conn = connection
  connection = null
  currentMatch = null
  useLiveStore.setState({ status: 'idle' })
  if (conn) void conn.stop().catch(() => undefined)
}

export function acquireMatch(matchId: string) {
  clearTimeout(stopTimer)
  refs++
  if (currentMatch === matchId && connection) return
  if (connection) stop()
  void start(matchId)
}

export function releaseMatch() {
  refs = Math.max(0, refs - 1)
  if (refs > 0) return
  // Defer: StrictMode unmounts and remounts immediately, which must not tear the socket down.
  stopTimer = setTimeout(() => { if (refs === 0) stop() }, 250)
}

