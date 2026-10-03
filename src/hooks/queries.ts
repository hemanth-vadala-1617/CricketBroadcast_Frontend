import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { CreateMatchInput, MatchRules, MatchSummary, OverlayTheme, Player, Team, Tournament, Venue } from '../lib/types'

function qs(params: Record<string, string | boolean | undefined | null>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const keys = {
  teams: ['teams'] as const,
  players: ['players'] as const,
  venues: ['venues'] as const,
  tournaments: ['tournaments'] as const,
  rules: ['match-rules'] as const,
  themes: ['themes'] as const,
  matches: ['matches'] as const,
}

export const useTeams = (includeInactive = false) =>
  useQuery({ queryKey: [...keys.teams, includeInactive], queryFn: () => api.get<Team[]>(`/api/teams${qs({ includeInactive })}`) })

export const usePlayers = (p: { search?: string; teamId?: string; includeInactive?: boolean } = {}) =>
  useQuery({ queryKey: [...keys.players, p], queryFn: () => api.get<Player[]>(`/api/players${qs(p)}`) })

export const useVenues = (search?: string) =>
  useQuery({ queryKey: [...keys.venues, search ?? ''], queryFn: () => api.get<Venue[]>(`/api/venues${qs({ search })}`) })

export const useTournaments = (search?: string) =>
  useQuery({ queryKey: [...keys.tournaments, search ?? ''], queryFn: () => api.get<Tournament[]>(`/api/tournaments${qs({ search })}`) })

export const useRules = () => useQuery({ queryKey: keys.rules, queryFn: () => api.get<MatchRules[]>('/api/match-rules') })
export const useThemes = () => useQuery({ queryKey: keys.themes, queryFn: () => api.get<OverlayTheme[]>('/api/themes') })

export const useMatches = (p: { status?: string; tournamentId?: string; search?: string } = {}) =>
  useQuery({ queryKey: [...keys.matches, p], queryFn: () => api.get<MatchSummary[]>(`/api/matches${qs(p)}`) })

export const useMatch = (id: string | undefined) =>
  useQuery({ queryKey: [...keys.matches, 'one', id], queryFn: () => api.get<MatchSummary>(`/api/matches/${id}`), enabled: !!id })

/** Create/update/delete with automatic list invalidation. Pass the query-key root(s) to refresh. */
export function useSaveMutation<TIn, TOut = unknown>(path: string, invalidate: readonly (readonly string[])[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: TIn }) => (id ? api.put<TOut>(`${path}/${id}`, body) : api.post<TOut>(path, body)),
    onSuccess: () => { for (const k of invalidate) void qc.invalidateQueries({ queryKey: k }) },
  })
}
export function useDeleteMutation<TOut = unknown>(path: string, invalidate: readonly (readonly string[])[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.del<TOut>(`${path}/${id}`),
    onSuccess: () => { for (const k of invalidate) void qc.invalidateQueries({ queryKey: k }) },
  })
}
export function useCreateMatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: CreateMatchInput }) => (id ? api.put<MatchSummary>(`/api/matches/${id}`, body) : api.post<MatchSummary>('/api/matches', body)),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: keys.matches }) },
  })
}
