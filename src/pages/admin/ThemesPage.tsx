import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, ColorField, Field, ImageUpload, Input, PageHeader, Table, Td, Th } from '../../components/ui'
import { errorMessage } from '../../lib/api'
import type { OverlayTheme, OverlayThemeInput } from '../../lib/types'
import { keys, useSaveMutation, useThemes } from '../../hooks/queries'
import { toast } from '../../store/useToast'
import { assetUrl, contrastText } from '../../lib/utils'
import { DeleteDialog, EntityModal, FormGrid, ListCard } from './AdminKit'
import { useDeleteFlow } from './adminHooks'

const blank: OverlayThemeInput = {
  name: '', primaryColor: '#0f6b4f', secondaryColor: '#7a1fa2', accentColor: '#ffd400',
  backgroundUrl: null, logoUrl: null, watermarkUrl: null, watermarkText: null,
}

/** A miniature scorebug painted with the chosen colours, so the admin sees the look before saving. */
function ThemePreview({ theme }: { theme: Pick<OverlayThemeInput, 'primaryColor' | 'secondaryColor' | 'accentColor' | 'watermarkText' | 'backgroundUrl'> }) {
  return (
    <div aria-label="Theme preview" className="overflow-hidden rounded-lg border border-slate-200" style={{ background: theme.backgroundUrl ? `center / cover url(${assetUrl(theme.backgroundUrl)})` : '#1e293b' }}>
      <div className="flex items-stretch text-sm font-bold">
        <div className="flex-1 px-3 py-2" style={{ background: theme.primaryColor, color: contrastText(theme.primaryColor) }}>IND <span className="ml-1 text-lg">182-4</span> <span className="text-xs opacity-80">18.2</span></div>
        <div className="px-3 py-2" style={{ background: '#000', color: theme.accentColor }}>4</div>
        <div className="flex-1 px-3 py-2 text-right" style={{ background: theme.primaryColor, color: contrastText(theme.primaryColor) }}>AUS <span className="text-xs">BOWLING</span></div>
      </div>
      <div className="flex justify-between px-3 py-1 text-xs font-bold" style={{ background: theme.secondaryColor, color: contrastText(theme.secondaryColor) }}>
        <span>CRR: 9.93</span><span>P’SHIP: 41(22)</span><span style={{ color: theme.accentColor }}>{theme.watermarkText || 'LIVE'}</span>
      </div>
    </div>
  )
}

function ThemeModal({ theme, onClose }: { theme: OverlayTheme | null; onClose: () => void }) {
  const [form, setForm] = useState<OverlayThemeInput>(theme ? (({ id: _id, ...rest }) => rest)(theme) : blank)
  const [error, setError] = useState<string | null>(null)
  const save = useSaveMutation<OverlayThemeInput>('/api/themes', [keys.themes])
  const set = <K extends keyof OverlayThemeInput>(k: K, v: OverlayThemeInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  function submit() {
    if (!form.name.trim()) return setError('Enter a theme name.')
    setError(null)
    save.mutate({ id: theme?.id, body: { ...form, watermarkText: form.watermarkText?.trim() || null } }, {
      onSuccess: () => { toast.success(theme ? 'Theme updated.' : 'Theme created.'); onClose() },
      onError: (e) => setError(errorMessage(e)),
    })
  }

  return (
    <EntityModal title={theme ? 'Edit overlay theme' : 'Create overlay theme'} size="lg" onClose={onClose} onSave={submit} saving={save.isPending} error={error}>
      <ThemePreview theme={form} />
      <FormGrid>
        <Field label="Name">{(id) => <Input id={id} autoFocus value={form.name} onChange={(e) => set('name', e.target.value)} />}</Field>
        <Field label="Watermark text" hint="Shown on the right of the info strip, e.g. LIVE.">{(id) => <Input id={id} value={form.watermarkText ?? ''} onChange={(e) => set('watermarkText', e.target.value)} />}</Field>
        <ColorField label="Primary colour (score bars)" value={form.primaryColor} onChange={(v) => set('primaryColor', v)} />
        <ColorField label="Secondary colour (info strips)" value={form.secondaryColor} onChange={(v) => set('secondaryColor', v)} />
        <ColorField label="Accent colour (highlights)" value={form.accentColor} onChange={(v) => set('accentColor', v)} />
      </FormGrid>
      <FormGrid>
        <ImageUpload label="Background" preset="background" value={form.backgroundUrl} onChange={(v) => set('backgroundUrl', v)} hint="Optional. Overrides the venue's ground picture." />
        <ImageUpload label="Logo" preset="logo" value={form.logoUrl} onChange={(v) => set('logoUrl', v)} />
        <ImageUpload label="Watermark image" preset="watermark" value={form.watermarkUrl} onChange={(v) => set('watermarkUrl', v)} hint="Channel logo or Subscribe button, transparent PNG." />
      </FormGrid>
    </EntityModal>
  )
}

export default function ThemesPage() {
  const themes = useThemes()
  const [editing, setEditing] = useState<OverlayTheme | 'new' | null>(null)
  const del = useDeleteFlow('/api/themes', [keys.themes], 'Theme')

  return (
    <>
      <PageHeader title="Overlay themes" subtitle="Colours, logo and watermark for the broadcast graphics." actions={<Button onClick={() => setEditing('new')}><Plus className="size-4" aria-hidden />Create theme</Button>} />
      <ListCard loading={themes.isLoading} error={themes.error ? errorMessage(themes.error) : null} onRetry={() => void themes.refetch()}
        isEmpty={(themes.data ?? []).length === 0} emptyTitle="No themes yet.">
        <Table head={<tr><Th>Theme</Th><Th>Colours</Th><Th>Watermark</Th><Th className="text-right">Actions</Th></tr>}>
          {(themes.data ?? []).map((t) => (
            <tr key={t.id} className="hover:bg-slate-50">
              <Td className="font-semibold text-slate-900">{t.name}</Td>
              <Td>
                <div className="flex gap-1">
                  {[t.primaryColor, t.secondaryColor, t.accentColor].map((c) => <span key={c} title={c} className="size-6 rounded border border-slate-200" style={{ background: c }} />)}
                </div>
              </Td>
              <Td>{t.watermarkText ?? '—'}</Td>
              <Td className="text-right">
                <Button size="sm" variant="ghost" aria-label={`Edit ${t.name}`} onClick={() => setEditing(t)}><Pencil className="size-4" /></Button>
                <Button size="sm" variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => del.ask(t.id, t.name)}><Trash2 className="size-4 text-red-600" /></Button>
              </Td>
            </tr>
          ))}
        </Table>
      </ListCard>
      {editing && <ThemeModal key={editing === 'new' ? 'new' : editing.id} theme={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      <DeleteDialog flow={del} noun="theme" extra="Matches and tournaments using it fall back to no theme." />
    </>
  )
}
