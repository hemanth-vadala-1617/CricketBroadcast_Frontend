import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardList, ExternalLink, Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Field, FilterBar, Input, PageHeader, SearchBox, Select, StatusBadge, Table, TeamBadge, Td, Th, Truncate } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import type { MatchStatus, MatchSummary } from '../../lib/types'
import { formatDateTime } from '../../lib/utils'
import { keys, useCreateMatch, useMatches, useRules, useTeams, useThemes, useTournaments, useVenues } from '../../hooks/queries'
import { toast } from '../../store/useToast'
import { nextStep } from './nextStep'
import { rowClick } from './rowClick'
import MatchViewModal from './MatchViewModal'
import { DeleteDialog, EntityModal, FormGrid, ListCard } from './AdminKit'
import { useDebounced, useDeleteFlow, useIsAdmin } from './adminHooks'
import { applyTournament, emptyMatchForm, fromSummary, toCreateInput, validateMatchForm, type MatchFormValues } from './matchForm'

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'live', label: 'Live now' }, { value: 'Scheduled', label: 'Scheduled' }, { value: 'TossCompleted', label: 'Toss done' },
  { value: 'Completed', label: 'Completed' }, { value: 'Abandoned', label: 'Abandoned' },
]

function MatchModal({ match, onClose }: { match: MatchSummary | null; onClose: () => void }) {
  const tournaments = useTournaments()
  const teams = useTeams()
  const venues = useVenues()
  const rules = useRules()
  const themes = useThemes()
  const [form, setForm] = useState<MatchFormValues>(match ? fromSummary(match) : emptyMatchForm)
  const [error, setError] = useState<string | null>(null)
  const save = useCreateMatch()
  const set = <K extends keyof MatchFormValues>(k: K, v: MatchFormValues[K]) => setForm((f) => ({ ...f, [k]: v }))

  const tournament = (tournaments.data ?? []).find((t) => t.id === form.tournamentId)
  const selectedRules = (rules.data ?? []).find((r) => r.id === form.matchRulesId)

  function submit() {
    const invalid = validateMatchForm(form)
    if (invalid) return setError(invalid)
    setError(null)
    save.mutate({ id: match?.id, body: toCreateInput(form, selectedRules, tournament) }, {
      onSuccess: () => { toast.success(match ? 'Match updated.' : 'Match scheduled.'); onClose() },
      onError: (e) => setError(errorMessage(e)),
    })
  }

  const activeTeams = (teams.data ?? []).filter((t) => t.isActive)

  return (
    <EntityModal title={match ? 'Edit match' : 'Schedule match'} size="lg" onClose={onClose} onSave={submit} saving={save.isPending} error={error} saveLabel={match ? 'Save' : 'Schedule'}>
      <FormGrid>
        <Field label="Tournament" hint="Picking one fills in its default rules and theme.">
          {(id) => (
            <Select id={id} autoFocus value={form.tournamentId} onChange={(e) => setForm((f) => applyTournament(f, (tournaments.data ?? []).find((t) => t.id === e.target.value), rules.data ?? []))}>
              <option value="">Choose…</option>
              {(tournaments.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name} {t.season}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Match rules" hint={selectedRules ? (selectedRules.isTest ? 'Test match: days, sessions, follow-on.' : `${selectedRules.oversPerInnings} overs a side.`) : undefined}>
          {(id) => (
            <Select id={id} value={form.matchRulesId} onChange={(e) => set('matchRulesId', e.target.value)}>
              <option value="">Choose…</option>
              {(rules.data ?? []).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Home team (listed first)">
          {(id) => (
            <Select id={id} value={form.homeTeamId} onChange={(e) => set('homeTeamId', e.target.value)}>
              <option value="">Choose…</option>
              {activeTeams.filter((t) => t.id !== form.awayTeamId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Away team">
          {(id) => (
            <Select id={id} value={form.awayTeamId} onChange={(e) => set('awayTeamId', e.target.value)}>
              <option value="">Choose…</option>
              {activeTeams.filter((t) => t.id !== form.homeTeamId).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Venue">
          {(id) => (
            <Select id={id} value={form.venueId} onChange={(e) => set('venueId', e.target.value)}>
              <option value="">Choose…</option>
              {(venues.data ?? []).map((v) => <option key={v.id} value={v.id}>{v.name}{v.city ? `, ${v.city}` : ''}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Overlay theme" hint="Optional. Defaults to the tournament's theme.">
          {(id) => (
            <Select id={id} value={form.overlayThemeId} onChange={(e) => set('overlayThemeId', e.target.value)}>
              <option value="">None</option>
              {(themes.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Title" hint="Optional. Defaults to “Home vs Away”.">{(id) => <Input id={id} value={form.title} maxLength={200} onChange={(e) => set('title', e.target.value)} />}</Field>
        <Field label="Scheduled start">{(id) => <Input id={id} type="datetime-local" value={form.scheduledStart} onChange={(e) => set('scheduledStart', e.target.value)} />}</Field>
      </FormGrid>
    </EntityModal>
  )
}

export default function MatchesPage() {
  const isAdmin = useIsAdmin()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [tournamentId, setTournamentId] = useState('')
  const [editing, setEditing] = useState<MatchSummary | 'new' | null>(null)
  const [viewing, setViewing] = useState<MatchSummary | null>(null)
  const debounced = useDebounced(search)
  const tournaments = useTournaments()
  const matches = useMatches({ search: debounced, status, tournamentId })
  const del = useDeleteFlow('/api/matches', [keys.matches], 'Match')
  const filtered = search !== '' || status !== '' || tournamentId !== ''
  const rows = useMemo(() => matches.data ?? [], [matches.data])

  return (
    <>
      <PageHeader title="Matches" subtitle="A match goes Live when you set up the squads, record the toss and press Start. The scheduled time is only the plan." />
      <FilterBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search matches or teams…" />
        <Select aria-label="Filter by status" className="w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <Select aria-label="Filter by tournament" className="w-52" value={tournamentId} onChange={(e) => setTournamentId(e.target.value)}>
          <option value="">All tournaments</option>
          {(tournaments.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        {filtered && <Button variant="ghost" onClick={() => { setSearch(''); setStatus(''); setTournamentId('') }}>Clear filters</Button>}
        {isAdmin && <Button onClick={() => setEditing('new')}><Plus className="size-4" aria-hidden />Schedule match</Button>}
      </FilterBar>
      <ListCard loading={matches.isLoading} error={matches.error ? errorMessage(matches.error) : null} onRetry={() => void matches.refetch()}
        isEmpty={rows.length === 0} emptyTitle={filtered ? 'No matches match these filters.' : 'No matches yet.'}
        emptyHint={filtered ? undefined : 'Schedule your first match. You need a tournament, two teams, a venue and match rules.'}>
        {/* min width keeps every column readable; narrower screens get a horizontal scroller instead of squeezed rows */}
        <div className="[&_table]:min-w-[980px]">
        <Table head={<tr><Th>Match</Th><Th>Tournament</Th><Th>Venue</Th><Th>Start</Th><Th>Status</Th><Th className="text-center">Open</Th></tr>}>
          {rows.map((m) => (
            <tr key={m.id} className="cursor-pointer hover:bg-slate-50" onClick={rowClick(() => setViewing(m))}>
              <Td>
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <TeamBadge team={{ name: m.homeTeamName, shortName: m.homeShortName, logoUrl: null, primaryColor: null }} size={26} />
                  <Truncate text={m.homeTeamName} max="max-w-[8rem]" />
                  <span className="text-xs font-medium text-slate-400">vs</span>
                  <Truncate text={m.awayTeamName} max="max-w-[8rem]" />
                  <TeamBadge team={{ name: m.awayTeamName, shortName: m.awayShortName, logoUrl: null, primaryColor: null }} size={26} />
                </div>
                {m.resultText && <Truncate text={m.resultText} max="max-w-[16rem]" className="mt-0.5 text-xs text-slate-500" />}
              </Td>
              <Td><Truncate text={m.tournamentName} max="max-w-[11rem]" /></Td>
              <Td><Truncate text={m.venueName} max="max-w-[10rem]" /></Td>
              <Td className="whitespace-nowrap text-xs">{formatDateTime(m.scheduledStart)}</Td>
              <Td>
                <StatusBadge status={m.status as MatchStatus} />
                {(m.status === 'Scheduled' || m.status === 'TossCompleted') && <Truncate text={nextStep(m).hint} max="max-w-[11rem]" className={`mt-1 text-xs ${nextStep(m).overdue ? 'font-semibold text-amber-700' : 'text-slate-500'}`} />}
              </Td>
              {/* open the match page (set up, start, score live there), its scorecard, and (before it starts) edit / delete */}
              <Td className="whitespace-nowrap text-center">
                <Button size="sm" variant="ghost" aria-label={`View ${m.title}`} onClick={() => setViewing(m)}><Eye className="size-4" /></Button>
                <Link to={`/admin/matches/${m.id}`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-emerald-50"><ExternalLink className="size-3.5" aria-hidden />Open</Link>
                <Link to={`/admin/matches/${m.id}/scorecard`} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-emerald-50"><ClipboardList className="size-3.5" aria-hidden />Scorecard</Link>
                {isAdmin && m.status === 'Scheduled' && (
                  <>
                    <Button size="sm" variant="ghost" aria-label={`Edit ${m.title}`} onClick={() => setEditing(m)}><Pencil className="size-4" /></Button>
                    <Button size="sm" variant="ghost" aria-label={`Delete ${m.title}`} onClick={() => del.ask(m.id, m.title)}><Trash2 className="size-4 text-red-600" /></Button>
                  </>
                )}
              </Td>
            </tr>
          ))}
        </Table>
        </div>
      </ListCard>
      {viewing && <MatchViewModal key={viewing.id} match={viewing} onClose={() => setViewing(null)} />}
      {editing && <MatchModal key={editing === 'new' ? 'new' : editing.id} match={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <DeleteDialog flow={del} noun="match" extra="Only a match that has not started can be deleted." />
    </>
  )
}
