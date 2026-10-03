import type { ReactNode } from 'react'
import { Pencil } from 'lucide-react'
import { Button, Modal } from '../../components/ui'

export const dash = <span className="text-slate-400">—</span>

/** One label / value line of a read-only details card. */
export interface DetailRow { label: string; value: ReactNode }

// The read-only "view" dialog shared by every admin list: an optional header (logo, badges), then label / value rows.
export default function DetailsModal({ title, header, rows, canEdit, onClose, onEdit, children }: {
  title: string; header?: ReactNode; rows: DetailRow[]; canEdit: boolean; onClose: () => void; onEdit: () => void; children?: ReactNode
}) {
  return (
    <Modal open onClose={onClose} title={title} size="md" footer={<>
      <Button variant="secondary" onClick={onClose}>Close</Button>
      {canEdit && <Button onClick={onEdit}><Pencil className="size-4" aria-hidden />Edit</Button>}
    </>}>
      <div className="flex flex-col gap-4">
        {header}
        <dl className="rounded-lg border border-slate-200 px-4">
          {rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[9rem_minmax(0,1fr)] gap-3 border-b border-slate-100 py-2.5 text-sm last:border-0">
              <dt className="font-semibold text-slate-500">{r.label}</dt>
              <dd className="min-w-0 break-words text-slate-900">{r.value ?? dash}</dd>
            </div>
          ))}
        </dl>
        {children}
      </div>
    </Modal>
  )
}
