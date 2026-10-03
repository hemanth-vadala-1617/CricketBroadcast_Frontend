import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Field, FilterBar, ImageUpload, Input, NumberInput, PageHeader, SearchBox, Table, Td, Th } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import type { Venue, VenueInput } from '../../lib/types'
import { keys, useSaveMutation, useVenues } from '../../hooks/queries'
import { toast } from '../../store/useToast'
import { assetUrl, formatIndianNumber } from '../../lib/utils'
import { DeleteDialog, EntityModal, FormGrid, ListCard } from './AdminKit'
import { useDebounced, useDeleteFlow, useIsAdmin } from './adminHooks'

const blank: VenueInput = { name: '', city: '', state: '', country: '', capacity: 0, timezone: 'UTC', logoUrl: null, groundImageUrl: null }

function VenueModal({ venue, onClose }: { venue: Venue | null; onClose: () => void }) {
  const [form, setForm] = useState<VenueInput>(venue ? { name: venue.name, city: venue.city, state: venue.state, country: venue.country, capacity: venue.capacity, timezone: venue.timezone, logoUrl: venue.logoUrl, groundImageUrl: venue.groundImageUrl } : blank)
  const [error, setError] = useState<string | null>(null)
  const save = useSaveMutation<VenueInput>('/api/venues', [keys.venues])
  const set = <K extends keyof VenueInput>(k: K, v: VenueInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  function submit() {
    if (!form.name.trim()) return setError('Enter the venue name.')
    setError(null)
    save.mutate({ id: venue?.id, body: form }, {
      onSuccess: () => { toast.success(venue ? 'Venue updated.' : 'Venue added.'); onClose() },
      onError: (e) => setError(errorMessage(e)),
    })
  }

  return (
    <EntityModal title={venue ? 'Edit venue' : 'Add venue'} size="lg" onClose={onClose} onSave={submit} saving={save.isPending} error={error}>
      <FormGrid>
        <Field label="Venue name">{(id) => <Input id={id} autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} />}</Field>
        <Field label="City">{(id) => <Input id={id} value={form.city} onChange={(e) => set('city', e.target.value)} />}</Field>
        <Field label="State / region">{(id) => <Input id={id} value={form.state} onChange={(e) => set('state', e.target.value)} />}</Field>
        <Field label="Country">{(id) => <Input id={id} value={form.country} onChange={(e) => set('country', e.target.value)} />}</Field>
        <Field label="Capacity">{(id) => <NumberInput id={id} value={form.capacity} onValueChange={(n) => set('capacity', n)} />}</Field>
        <Field label="Timezone" hint="IANA name, e.g. Asia/Kolkata.">{(id) => <Input id={id} value={form.timezone} onChange={(e) => set('timezone', e.target.value)} />}</Field>
      </FormGrid>
      <FormGrid>
        <ImageUpload label="Logo" preset="logo" value={form.logoUrl} onChange={(v) => set('logoUrl', v)} />
        <ImageUpload label="Ground background" preset="background" value={form.groundImageUrl} onChange={(v) => set('groundImageUrl', v)} hint="Wide stadium picture shown behind the overlay (1920×1080 works best)." />
      </FormGrid>
    </EntityModal>
  )
}

export default function VenuesPage() {
  const isAdmin = useIsAdmin()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Venue | 'new' | null>(null)
  const venues = useVenues(useDebounced(search))
  const del = useDeleteFlow('/api/venues', [keys.venues], 'Venue')

  return (
    <>
      <PageHeader title="Venues" subtitle="Grounds. The ground picture becomes the overlay background." />
      <FilterBar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search venues…" />
        {search !== '' && <Button variant="ghost" onClick={() => setSearch('')}>Clear filters</Button>}
        {isAdmin && <Button onClick={() => setEditing('new')}><Plus className="size-4" aria-hidden />Add venue</Button>}
      </FilterBar>
      <ListCard loading={venues.isLoading} error={venues.error ? errorMessage(venues.error) : null} onRetry={() => void venues.refetch()}
        isEmpty={(venues.data ?? []).length === 0} emptyTitle={search ? 'No venues match.' : 'No venues yet.'}>
        <Table head={<tr><Th>Venue</Th><Th>Location</Th><Th>Capacity</Th><Th>Background</Th>{isAdmin && <Th className="text-right">Actions</Th>}</tr>}>
          {(venues.data ?? []).map((v) => (
            <tr key={v.id} className="hover:bg-slate-50">
              <Td className="font-semibold text-slate-900">{v.name}</Td>
              <Td>{[v.city, v.state, v.country].filter(Boolean).join(', ') || '—'}</Td>
              <Td>{v.capacity ? formatIndianNumber(v.capacity) : '—'}</Td>
              <Td>{v.groundImageUrl ? <img src={assetUrl(v.groundImageUrl)} alt="" className="h-10 w-20 rounded object-cover" /> : '—'}</Td>
              {isAdmin && (
                <Td className="text-right">
                  <Button size="sm" variant="ghost" aria-label={`Edit ${v.name}`} onClick={() => setEditing(v)}><Pencil className="size-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label={`Delete ${v.name}`} onClick={() => del.ask(v.id, v.name)}><Trash2 className="size-4 text-red-600" /></Button>
                </Td>
              )}
            </tr>
          ))}
        </Table>
      </ListCard>
      {editing && <VenueModal key={editing === 'new' ? 'new' : editing.id} venue={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <DeleteDialog flow={del} noun="venue" extra="A venue used by a match cannot be deleted." />
    </>
  )
}


