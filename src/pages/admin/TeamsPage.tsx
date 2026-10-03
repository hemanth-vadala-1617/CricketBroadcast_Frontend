import { useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Checkbox, ColorField, Field, FilterBar, ImageUpload, Input, PageHeader, SearchBox, TeamBadge, Table, Td, Th } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import type { Team, TeamInput } from '../../lib/types'
import { keys, useSaveMutation, useTeams } from '../../hooks/queries'
import { toast } from '../../store/useToast'
import { DeleteDialog, EntityModal, FormGrid, ListCard } from './AdminKit'
import { useDeleteFlow, useIsAdmin } from './adminHooks'

const blank: TeamInput = { name: '', shortName: '', country: '', logoUrl: null, primaryColor: '#1d4ed8', secondaryColor: '#f59e0b' }

function TeamModal({ team, onClose }: { team: Team | null; onClose: () => void }) {
  const [form, setForm] = useState<TeamInput>(team ? { name: team.name, shortName: team.shortName, country: team.country, logoUrl: team.logoUrl, primaryColor: team.primaryColor, secondaryColor: team.secondaryColor } : blank)
  const [error, setError] = useState<string | null>(null)
  const save = useSaveMutation<TeamInput>('/api/teams', [keys.teams])
  const set = <K extends keyof TeamInput>(k: K, v: TeamInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  function submit() {
    if (!form.name.trim()) return setError('Enter the team name.')
    if (!form.shortName.trim()) return setError('Enter a short name (e.g. IND).')
    setError(null)
    save.mutate({ id: team?.id, body: form }, {
      onSuccess: () => { toast.success(team ? 'Team updated.' : 'Team created.'); onClose() },
      onError: (e) => setError(errorMessage(e)),
    })
  }

  return (
    <EntityModal title={team ? 'Edit team' : 'Add team'} onClose={onClose} onSave={submit} saving={save.isPending} error={error}>
      <FormGrid>
        <Field label="Team name">{(id) => <Input id={id} autoFocus value={form.name} maxLength={100} onChange={(e) => set('name', e.target.value)} />}</Field>
        <Field label="Short name" hint="Shown on the scorebug, max 6 letters.">{(id) => <Input id={id} value={form.shortName} maxLength={6} onChange={(e) => set('shortName', e.target.value.toUpperCase())} />}</Field>
        <Field label="Country">{(id) => <Input id={id} value={form.country} onChange={(e) => set('country', e.target.value)} />}</Field>
        <ColorField label="Primary colour" value={form.primaryColor} onChange={(v) => set('primaryColor', v)} />
        <ColorField label="Secondary colour" value={form.secondaryColor} onChange={(v) => set('secondaryColor', v)} />
      </FormGrid>
      <ImageUpload label="Logo / flag" preset="teamLogo" value={form.logoUrl} onChange={(v) => set('logoUrl', v)} />
    </EntityModal>
  )
}

export default function TeamsPage() {
  const isAdmin = useIsAdmin()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<Team | 'new' | null>(null)
  const teams = useTeams(showInactive)
  const del = useDeleteFlow('/api/teams', [keys.teams], 'Team')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (teams.data ?? []).filter((t) => !q || [t.name, t.shortName, t.country].some((v) => v.toLowerCase().includes(q)))
  }, [teams.data, search])
  const filtered = search !== '' || showInactive

  return (
    <>
      <PageHeader title="Teams" subtitle="Franchises and national sides. Colours and logos drive the overlay." />
      <FilterBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search teams…" />
        <Checkbox label="Show inactive" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        {filtered && <Button variant="ghost" onClick={() => { setSearch(''); setShowInactive(false) }}>Clear filters</Button>}
        {isAdmin && <Button onClick={() => setEditing('new')}><Plus className="size-4" aria-hidden />Add team</Button>}
      </FilterBar>
      <ListCard loading={teams.isLoading} error={teams.error ? errorMessage(teams.error) : null} onRetry={() => void teams.refetch()}
        isEmpty={rows.length === 0} emptyTitle={filtered ? 'No teams match these filters.' : 'No teams yet.'} emptyHint={filtered ? undefined : 'Add the teams that will play before scheduling a match.'}>
        <Table head={<tr><Th>Team</Th><Th>Short</Th><Th>Country</Th><Th>Players</Th><Th>Status</Th>{isAdmin && <Th className="text-right">Actions</Th>}</tr>}>
          {rows.map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <Td><div className="flex items-center gap-3"><TeamBadge team={t} /><span className="font-semibold text-slate-900">{t.name}</span></div></Td>
              <Td className="font-mono">{t.shortName}</Td>
              <Td>{t.country || '—'}</Td>
              <Td>{t.playerCount}</Td>
              <Td>{t.isActive ? 'Active' : <span className="font-semibold text-amber-700">Inactive</span>}</Td>
              {isAdmin && (
                <Td className="text-right">
                  <Button size="sm" variant="ghost" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => del.ask(t.id, t.name)}><Trash2 className="size-4 text-red-600" /></Button>
                </Td>
              )}
            </tr>
          ))}
        </Table>
      </ListCard>
      {editing && <TeamModal key={editing === 'new' ? 'new' : editing.id} team={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <DeleteDialog flow={del} noun="team" extra="A team that has played matches is deactivated instead of removed." />
    </>
  )
}
