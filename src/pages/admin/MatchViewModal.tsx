import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, Modal, Spinner, StatusBadge } from '../../components/ui'
import { TeamSheet } from '../../components/TeamSheet'
import { api } from '../../lib/api'
import type { MatchStatus, MatchSummary, Squad } from '../../lib/types'
import { formatDateTime } from '../../lib/utils'
import { keys } from '../../hooks/queries'
import { dash } from './DetailsModal'

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 border-b border-slate-100 py-2 text-sm last:border-0">
      <dt className="font-semibold text-slate-500">{label}</dt><dd className="min-w-0 break-words text-slate-900">{value || dash}</dd>
    </div>
  )
}

// Read-only match card: the facts, then each side's team sheet (XI, bench, support staff).
export default function MatchViewModal({ match: m, onClose }: { match: MatchSummary; onClose: () => void }) {
  const squads = useQuery({ queryKey: [...keys.matches, 'squads', m.id], queryFn: () => api.get<Squad[]>(`/api/matches/${m.id}/squads`) })
  const toss = m.tossWinnerTeamId ? `${m.tossWinnerTeamId === m.homeTeamId ? m.homeTeamName : m.awayTeamName} chose to ${m.tossDecision?.toLowerCase()}` : null
  return (
    <Modal open onClose={onClose} title={m.title} size="xl" footer={<>
      <Button variant="secondary" onClick={onClose}>Close</Button>
      <Link to={`/admin/matches/${m.id}/scorecard`} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-brand hover:bg-emerald-50"><ClipboardList className="size-4" aria-hidden />Scorecard</Link>
      <Link to={`/admin/matches/${m.id}`} className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-2 text-sm font-semibold text-white hover:bg-brand-dark"><ExternalLink className="size-4" aria-hidden />Open match</Link>
    </>}>
      <div className="flex flex-col gap-4">
        <dl className="rounded-lg border border-slate-200 px-4">
          <Row label="Status" value={<StatusBadge status={m.status as MatchStatus} />} />
          <Row label="Tournament" value={m.tournamentName} />
          <Row label="Venue" value={m.venueName} />
          <Row label="Start" value={formatDateTime(m.scheduledStart)} />
          <Row label="Format" value={m.matchFormat} />
          <Row label="Toss" value={toss} />
          <Row label="Result" value={m.resultText} />
        </dl>
        {squads.isLoading ? <Spinner /> : (
          <div className="grid gap-4 md:grid-cols-2">
            <TeamSheet teamName={m.homeTeamName} squad={squads.data?.find((s) => s.teamId === m.homeTeamId)} />
            <TeamSheet teamName={m.awayTeamName} squad={squads.data?.find((s) => s.teamId === m.awayTeamId)} />
          </div>
        )}
      </div>
    </Modal>
  )
}
