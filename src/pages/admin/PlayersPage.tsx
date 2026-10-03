import { useState } from 'react'
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react'
import { ActionMenu, Avatar, Badge, Button, Checkbox, Field, FilterBar, ImageUpload, Input, NumberInput, PageHeader, SearchBox, Select, Table, Td, Th, Truncate } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import type { Player, PlayerInput, PlayerRole } from '../../lib/types'
import { keys, usePlayers, useSaveMutation, useTeams } from '../../hooks/queries'
import { toast } from '../../store/useToast'
import { DeleteDialog, EntityModal, FormGrid, ListCard } from './AdminKit'
import { rowClick } from './rowClick'
import { useDebounced, useDeleteFlow, useIsAdmin } from './adminHooks'
import PlayerViewModal from './PlayerViewModal'

const ROLES: { value: PlayerRole; label: string }[] = [
  { value: 'Batter', label: 'Batter' }, { value: 'Bowler', label: 'Bowler' },
  { value: 'AllRounder', label: 'All-rounder' }, { value: 'WicketKeeper', label: 'Wicket-keeper' },
]
const roleLabel = (r: PlayerRole) => ROLES.find((x) => x.value === r)?.label ?? r

const blank: PlayerInput = {
  currentTeamId: null, firstName: '', lastName: '', displayName: '', shortName: '', photoUrl: null,
  jerseyNumber: 0, battingStyle: '', bowlingStyle: '', playerRole: 'Batter', isActive: true,
  careerLabel: '', careerMatches: null, careerRuns: null, careerAverage: null, careerStrikeRate: null, careerFifties: null, careerHundreds: null,
}

// Optional numeric field: empty means "not entered" (null), so the overlay card leaves that row out.
function OptionalNumber({ id, value, onChange, step }: { id: string; value: number | null; onChange: (n: number | null) => void; step?: string }) {
  return <Input id={id} type="number" inputMode="decimal" min={0} step={step} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
}

function PlayerModal({ player, defaultTeamId, onClose }: { player: Player | null; defaultTeamId: string; onClose: () => void }) {
  const teams = useTeams()
  const [form, setForm] = useState<PlayerInput>(player
    ? { currentTeamId: player.currentTeamId, firstName: player.firstName, lastName: player.lastName, displayName: player.displayName, shortName: player.shortName, photoUrl: player.photoUrl, jerseyNumber: player.jerseyNumber, battingStyle: player.battingStyle, bowlingStyle: player.bowlingStyle, playerRole: player.playerRole, isActive: player.isActive, careerLabel: player.careerLabel, careerMatches: player.careerMatches, careerRuns: player.careerRuns, careerAverage: player.careerAverage, careerStrikeRate: player.careerStrikeRate, careerFifties: player.careerFifties, careerHundreds: player.careerHundreds }
    : { ...blank, currentTeamId: defaultTeamId || null })
  const [error, setError] = useState<string | null>(null)
  const save = useSaveMutation<PlayerInput>('/api/players', [keys.players, keys.teams])
  const set = <K extends keyof PlayerInput>(k: K, v: PlayerInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  function submit() {
    if (!form.displayName.trim()) return setError('Enter the name shown on screen.')
    if (!form.shortName.trim()) return setError('Enter a short name for the scoreboard (e.g. V Kohli).')
    setError(null)
    save.mutate({ id: player?.id, body: form }, {
      onSuccess: () => { toast.success(player ? 'Player updated.' : 'Player added.'); onClose() },
      onError: (e) => setError(errorMessage(e)),
    })
  }

  return (
    <EntityModal title={player ? 'Edit player' : 'Add player'} size="lg" onClose={onClose} onSave={submit} saving={save.isPending} error={error}>
      <FormGrid>
        <Field label="Display name">{(id) => <Input id={id} autoFocus value={form.displayName} onChange={(e) => set('displayName', e.target.value)} />}</Field>
        <Field label="Short name" hint="Used on the scorebug.">{(id) => <Input id={id} value={form.shortName} maxLength={20} onChange={(e) => set('shortName', e.target.value)} />}</Field>
        <Field label="First name">{(id) => <Input id={id} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />}</Field>
        <Field label="Last name">{(id) => <Input id={id} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />}</Field>
        <Field label="Team" hint="Default team only. Squads are picked per match.">
          {(id) => (
            <Select id={id} value={form.currentTeamId ?? ''} onChange={(e) => set('currentTeamId', e.target.value || null)}>
              <option value="">No team</option>
              {(teams.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Role">{(id) => <Select id={id} value={form.playerRole} onChange={(e) => set('playerRole', e.target.value as PlayerRole)}>{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</Select>}</Field>
        <Field label="Jersey number">{(id) => <NumberInput id={id} max={999} grouped={false} value={form.jerseyNumber} onValueChange={(n) => set('jerseyNumber', n)} />}</Field>
        <Field label="Batting style">{(id) => <Input id={id} placeholder="Right-hand bat" value={form.battingStyle} onChange={(e) => set('battingStyle', e.target.value)} />}</Field>
        <Field label="Bowling style">{(id) => <Input id={id} placeholder="Right-arm fast" value={form.bowlingStyle} onChange={(e) => set('bowlingStyle', e.target.value)} />}</Field>
      </FormGrid>
      <fieldset className="rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Career batting (optional)</legend>
        <p className="mb-3 text-xs text-slate-500">Shown on the "new batter" graphic when this player walks in. Leave a box empty to leave that row out.</p>
        <FormGrid>
          <Field label="Label" hint="e.g. T20I, IPL, Test.">{(id) => <Input id={id} maxLength={20} value={form.careerLabel} onChange={(e) => set('careerLabel', e.target.value)} />}</Field>
          <Field label="Matches">{(id) => <OptionalNumber id={id} value={form.careerMatches} onChange={(n) => set('careerMatches', n)} />}</Field>
          <Field label="Runs">{(id) => <OptionalNumber id={id} value={form.careerRuns} onChange={(n) => set('careerRuns', n)} />}</Field>
          <Field label="Average">{(id) => <OptionalNumber id={id} step="0.01" value={form.careerAverage} onChange={(n) => set('careerAverage', n)} />}</Field>
          <Field label="Strike rate">{(id) => <OptionalNumber id={id} step="0.1" value={form.careerStrikeRate} onChange={(n) => set('careerStrikeRate', n)} />}</Field>
          <Field label="50s">{(id) => <OptionalNumber id={id} value={form.careerFifties} onChange={(n) => set('careerFifties', n)} />}</Field>
          <Field label="100s">{(id) => <OptionalNumber id={id} value={form.careerHundreds} onChange={(n) => set('careerHundreds', n)} />}</Field>
        </FormGrid>
      </fieldset>
      <ImageUpload label="Photo" preset="playerPhoto" value={form.photoUrl} onChange={(v) => set('photoUrl', v)} hint="A transparent PNG cut-out (head and shoulders) looks best on the overlay cards. Max 5 MB." />
      <Checkbox label="Active (available for squads)" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
    </EntityModal>
  )
}

export default function PlayersPage() {
  const isAdmin = useIsAdmin()
  const [search, setSearch] = useState('')
  const [teamId, setTeamId] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<Player | 'new' | null>(null)
  const [viewing, setViewing] = useState<Player | null>(null)
  const debounced = useDebounced(search)
  const teams = useTeams()
  const players = usePlayers({ search: debounced, teamId, includeInactive: showInactive })
  const del = useDeleteFlow('/api/players', [keys.players, keys.teams], 'Player')
  const filtered = search !== '' || teamId !== '' || showInactive

  return (
    <>
      <PageHeader title="Players" subtitle="Everyone who can appear in a squad." />
      <FilterBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search players…" />
        <Select aria-label="Filter by team" className="w-48" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
          <option value="">All teams</option>
          {(teams.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select>
        <Checkbox label="Show inactive" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        {filtered && <Button variant="ghost" onClick={() => { setSearch(''); setTeamId(''); setShowInactive(false) }}>Clear filters</Button>}
        {isAdmin && <Button onClick={() => setEditing('new')}><Plus className="size-4" aria-hidden />Add player</Button>}
      </FilterBar>
      <ListCard loading={players.isLoading} error={players.error ? errorMessage(players.error) : null} onRetry={() => void players.refetch()}
        isEmpty={(players.data ?? []).length === 0} emptyTitle={filtered ? 'No players match these filters.' : 'No players yet.'}>
        <Table head={<tr><Th>Player</Th><Th>Team</Th><Th>Role</Th><Th>#</Th><Th>Styles</Th><Th className="text-right">Actions</Th></tr>}>
          {(players.data ?? []).map((p) => (
            <tr key={p.id} className="cursor-pointer hover:bg-slate-50" onClick={rowClick(() => setViewing(p))}>
              <Td>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setViewing(p)} aria-label={`View ${p.displayName}`} className="group flex items-center gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-brand">
                    <Avatar name={p.displayName} src={p.photoUrl} />
                    <span><Truncate text={p.displayName} max="max-w-[12rem]" focusable={false} className="font-semibold text-slate-900 group-hover:text-brand group-hover:underline" /><Truncate text={p.shortName} max="max-w-[12rem]" focusable={false} className="text-xs text-slate-500" /></span>
                  </button>
                  {!p.isActive && <Badge tone="amber">Inactive</Badge>}
                </div>
              </Td>
              <Td><Truncate text={p.currentTeamName} max="max-w-[10rem]" /></Td>
              <Td>{roleLabel(p.playerRole)}</Td>
              <Td>{p.jerseyNumber || '—'}</Td>
              <Td><Truncate text={[p.battingStyle, p.bowlingStyle].filter(Boolean).join(' · ')} max="max-w-[11rem]" className="text-xs text-slate-500" /></Td>
              <Td className="text-right">
                <ActionMenu label={`Actions for ${p.displayName}`} items={[
                  { label: 'View', icon: <Eye className="size-4" aria-hidden />, onSelect: () => setViewing(p) },
                  { label: 'Edit', icon: <Pencil className="size-4" aria-hidden />, onSelect: () => setEditing(p), hidden: !isAdmin },
                  { label: 'Delete', icon: <Trash2 className="size-4" aria-hidden />, onSelect: () => del.ask(p.id, p.displayName), danger: true, hidden: !isAdmin },
                ]} />
              </Td>
            </tr>
          ))}
        </Table>
      </ListCard>
      {editing && <PlayerModal key={editing === 'new' ? 'new' : editing.id} player={editing === 'new' ? null : editing} defaultTeamId={teamId} onClose={() => setEditing(null)} />}
      {viewing && <PlayerViewModal key={viewing.id} player={viewing} isAdmin={isAdmin} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null) }} />}
      <DeleteDialog flow={del} noun="player" extra="A player who appears in match history is deactivated instead of removed." />
    </>
  )
}


