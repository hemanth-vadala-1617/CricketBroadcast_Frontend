import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Avatar, Badge, Button, Checkbox, Field, FilterBar, ImageUpload, Input, NumberInput, PageHeader, SearchBox, Select, Table, Td, Th } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import type { Player, PlayerInput, PlayerRole } from '../../lib/types'
import { keys, usePlayers, useSaveMutation, useTeams } from '../../hooks/queries'
import { toast } from '../../store/useToast'
import { DeleteDialog, EntityModal, FormGrid, ListCard } from './AdminKit'
import { useDebounced, useDeleteFlow, useIsAdmin } from './adminHooks'

const ROLES: { value: PlayerRole; label: string }[] = [
  { value: 'Batter', label: 'Batter' }, { value: 'Bowler', label: 'Bowler' },
  { value: 'AllRounder', label: 'All-rounder' }, { value: 'WicketKeeper', label: 'Wicket-keeper' },
]
const roleLabel = (r: PlayerRole) => ROLES.find((x) => x.value === r)?.label ?? r

const blank: PlayerInput = {
  currentTeamId: null, firstName: '', lastName: '', displayName: '', shortName: '', photoUrl: null,
  jerseyNumber: 0, battingStyle: '', bowlingStyle: '', playerRole: 'Batter', isActive: true,
}

function PlayerModal({ player, defaultTeamId, onClose }: { player: Player | null; defaultTeamId: string; onClose: () => void }) {
  const teams = useTeams()
  const [form, setForm] = useState<PlayerInput>(player
    ? { currentTeamId: player.currentTeamId, firstName: player.firstName, lastName: player.lastName, displayName: player.displayName, shortName: player.shortName, photoUrl: player.photoUrl, jerseyNumber: player.jerseyNumber, battingStyle: player.battingStyle, bowlingStyle: player.bowlingStyle, playerRole: player.playerRole, isActive: player.isActive }
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
        <Table head={<tr><Th>Player</Th><Th>Team</Th><Th>Role</Th><Th>#</Th><Th>Styles</Th>{isAdmin && <Th className="text-right">Actions</Th>}</tr>}>
          {(players.data ?? []).map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <Td>
                <div className="flex items-center gap-3">
                  <Avatar name={p.displayName} src={p.photoUrl} />
                  <div><div className="font-semibold text-slate-900">{p.displayName}</div><div className="text-xs text-slate-500">{p.shortName}</div></div>
                  {!p.isActive && <Badge tone="amber">Inactive</Badge>}
                </div>
              </Td>
              <Td>{p.currentTeamName ?? '—'}</Td>
              <Td>{roleLabel(p.playerRole)}</Td>
              <Td>{p.jerseyNumber || '—'}</Td>
              <Td className="text-xs text-slate-500">{[p.battingStyle, p.bowlingStyle].filter(Boolean).join(' · ') || '—'}</Td>
              {isAdmin && (
                <Td className="text-right">
                  <Button size="sm" variant="ghost" aria-label={`Edit ${p.displayName}`} onClick={() => setEditing(p)}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label={`Delete ${p.displayName}`} onClick={() => del.ask(p.id, p.displayName)}><Trash2 className="size-4 text-red-600" /></Button>
                </Td>
              )}
            </tr>
          ))}
        </Table>
      </ListCard>
      {editing && <PlayerModal key={editing === 'new' ? 'new' : editing.id} player={editing === 'new' ? null : editing} defaultTeamId={teamId} onClose={() => setEditing(null)} />}
      <DeleteDialog flow={del} noun="player" extra="A player who appears in match history is deactivated instead of removed." />
    </>
  )
}


