import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Eye, Folder, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react'
import { ActionMenu, Badge, Button, Checkbox, ColorField, Field, FilterBar, ImageUpload, Input, PageHeader, SearchBox, TeamBadge, Table, Td, Th, Truncate } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import type { Player, Team, TeamInput } from '../../lib/types'
import { keys, useSaveMutation, useTeams, useTournaments } from '../../hooks/queries'
import { toast } from '../../store/useToast'
import { rowClick } from './rowClick'
import DetailsModal from './DetailsModal'
import PlayerViewModal from './PlayerViewModal'
import TeamPlayersList from './TeamPlayersList'
import { DeleteDialog, EntityModal, FormGrid, ListCard } from './AdminKit'
import { useDeleteFlow, useIsAdmin } from './adminHooks'
import { competitionLabel, competitionNames, groupTeams } from './teamFolders'

const blank: TeamInput = { name: '', shortName: '', country: '', logoUrl: null, primaryColor: '#1d4ed8', secondaryColor: '#f59e0b', tournamentIds: [] }

function TeamModal({ team, onClose }: { team: Team | null; onClose: () => void }) {
  const [form, setForm] = useState<TeamInput>(team ? { name: team.name, shortName: team.shortName, country: team.country, logoUrl: team.logoUrl, primaryColor: team.primaryColor, secondaryColor: team.secondaryColor, tournamentIds: team.tournamentIds ?? [] } : blank)
  const [error, setError] = useState<string | null>(null)
  const tournaments = useTournaments()
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
      <fieldset className="rounded-lg border border-slate-200 p-3">
        <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Competitions (folders)</legend>
        <p className="mb-2 text-xs text-slate-500">The team is listed under each competition you tick, like folders on the Teams page. Add competitions on the Tournaments page.</p>
        {(tournaments.data ?? []).length === 0 ? <p className="text-sm text-slate-500">No competitions yet.</p> : (
          <div className="grid gap-1 sm:grid-cols-2">
            {(tournaments.data ?? []).map((t) => {
              const ids = form.tournamentIds ?? []
              return <Checkbox key={t.id} label={competitionLabel(t)} checked={ids.includes(t.id)} onChange={(e) => set('tournamentIds', e.target.checked ? [...ids, t.id] : ids.filter((x) => x !== t.id))} />
            })}
          </div>
        )}
      </fieldset>
    </EntityModal>
  )
}

export default function TeamsPage() {
  const isAdmin = useIsAdmin()
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<Team | 'new' | null>(null)
  const [viewing, setViewing] = useState<Team | null>(null)
  const [viewingPlayer, setViewingPlayer] = useState<Player | null>(null)
  const teams = useTeams(showInactive)
  const tournaments = useTournaments()
  const [grouped, setGrouped] = useState(true)
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set())
  const toggleFolder = (id: string) => setClosed((c) => { const n = new Set(c); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const del = useDeleteFlow('/api/teams', [keys.teams], 'Team')

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (teams.data ?? []).filter((t) => !q || [t.name, t.shortName, t.country].some((v) => v.toLowerCase().includes(q)))
  }, [teams.data, search])
  const filtered = search !== '' || showInactive
  const folders = useMemo(() => groupTeams(rows, tournaments.data ?? []), [rows, tournaments.data])

  return (
    <>
      <PageHeader title="Teams" subtitle="Franchises and national sides. Colours and logos drive the overlay." />
      <FilterBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search teams…" />
        <Checkbox label="Group by competition" checked={grouped} onChange={(e) => setGrouped(e.target.checked)} />
        <Checkbox label="Show inactive" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
        {filtered && <Button variant="ghost" onClick={() => { setSearch(''); setShowInactive(false) }}>Clear filters</Button>}
        {isAdmin && <Button onClick={() => setEditing('new')}><Plus className="size-4" aria-hidden />Add team</Button>}
      </FilterBar>
      <ListCard loading={teams.isLoading} error={teams.error ? errorMessage(teams.error) : null} onRetry={() => void teams.refetch()}
        isEmpty={rows.length === 0} emptyTitle={filtered ? 'No teams match these filters.' : 'No teams yet.'} emptyHint={filtered ? undefined : 'Add the teams that will play before scheduling a match.'}>
        {(() => {
          const renderTable = (list: typeof rows) => (
            <Table head={<tr><Th>Team</Th><Th>Short</Th><Th>Country</Th><Th>Players</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr>}>
                        {list.map((t) => (
            <tr key={t.id} className="cursor-pointer hover:bg-slate-50" onClick={rowClick(() => setViewing(t))}>
              <Td><div className="flex items-center gap-3"><TeamBadge team={t} /><Truncate text={t.name} max="max-w-[14rem]" className="font-semibold text-slate-900" /></div></Td>
              <Td className="font-mono">{t.shortName}</Td>
              <Td><Truncate text={t.country} max="max-w-[10rem]" /></Td>
              <Td>{t.playerCount}</Td>
              <Td>{t.isActive ? 'Active' : <span className="font-semibold text-amber-700">Inactive</span>}</Td>
              <Td className="text-right">
                <ActionMenu label={`Actions for ${t.name}`} items={[
                  { label: 'View', icon: <Eye className="size-4" aria-hidden />, onSelect: () => setViewing(t) },
                  { label: 'Edit', icon: <Pencil className="size-4" aria-hidden />, onSelect: () => setEditing(t), hidden: !isAdmin },
                  { label: 'Delete', icon: <Trash2 className="size-4" aria-hidden />, onSelect: () => del.ask(t.id, t.name), danger: true, hidden: !isAdmin },
                ]} />
              </Td>
            </tr>
              ))}
            </Table>
          )
          if (!grouped) return renderTable(rows)
          return (
            <div className="divide-y divide-slate-200" data-testid="team-folders">
              {folders.map((f) => {
                const open = !closed.has(f.id)
                const Icon = open ? FolderOpen : Folder
                return (
                  <section key={f.id} data-testid="team-folder" data-folder={f.name}>
                    <button type="button" aria-expanded={open} onClick={() => toggleFolder(f.id)}
                      className="flex w-full items-center gap-3 bg-slate-50 px-4 py-3 text-left hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand">
                      {open ? <ChevronDown className="size-4 text-slate-500" aria-hidden /> : <ChevronRight className="size-4 text-slate-500" aria-hidden />}
                      <Icon className="size-5 text-amber-500" aria-hidden />
                      <span className="font-bold text-slate-900">{f.name}</span>
                      {f.subtitle && <span className="text-sm text-slate-500">{f.subtitle}</span>}
                      <span className="ml-auto rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{f.teams.length} {f.teams.length === 1 ? 'team' : 'teams'}</span>
                    </button>
                    {open && renderTable(f.teams)}
                  </section>
                )
              })}
            </div>
          )
        })()}
      </ListCard>
      {viewing && (
        <DetailsModal wide title={viewing.name} canEdit={isAdmin} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null) }}
          header={<div className="flex items-center gap-4"><TeamBadge team={viewing} size={72} /><div><h3 className="text-xl font-bold text-slate-900">{viewing.name}</h3><div className="mt-2 flex gap-2"><Badge>{viewing.shortName}</Badge><Badge tone={viewing.isActive ? 'green' : 'amber'}>{viewing.isActive ? 'Active' : 'Inactive'}</Badge></div></div></div>}
          rows={[
            { label: 'Short name', value: viewing.shortName }, { label: 'Country', value: viewing.country || null },
            { label: 'Players', value: viewing.playerCount },
            { label: 'Competitions', value: competitionNames(viewing, tournaments.data ?? []).join(', ') || null },
            { label: 'Colours', value: <span className="flex gap-2">{[viewing.primaryColor, viewing.secondaryColor].map((c, i) => c ? <span key={i} title={c} className="size-6 rounded border border-slate-200" style={{ background: c }} /> : null)}</span> },
          ]}>
          <TeamPlayersList teamId={viewing.id} onOpen={setViewingPlayer} />
        </DetailsModal>
      )}
      {viewingPlayer && <PlayerViewModal key={viewingPlayer.id} player={viewingPlayer} isAdmin={false} onClose={() => setViewingPlayer(null)} onEdit={() => {}} />}
      {editing && <TeamModal key={editing === 'new' ? 'new' : editing.id} team={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <DeleteDialog flow={del} noun="team" extra="A team that has played matches is deactivated instead of removed." />
    </>
  )
}
