import type { ReactNode } from 'react'
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, Modal, Spinner } from '../../components/ui'
import type { DeleteFlow } from './adminHooks'

/** Card around a table with the three standard states: loading, error (retry), empty. */
export function ListCard({ loading, error, onRetry, isEmpty, emptyTitle, emptyHint, emptyAction, children }: {
  loading: boolean; error?: string | null; onRetry?: () => void
  isEmpty: boolean; emptyTitle: string; emptyHint?: string; emptyAction?: ReactNode
  children: ReactNode
}) {
  return (
    <Card>
      {loading ? <Spinner />
        : error ? <ErrorState message={error} onRetry={onRetry} />
          : isEmpty ? <EmptyState title={emptyTitle} hint={emptyHint} action={emptyAction} />
            : children}
    </Card>
  )
}

/** The one create/edit dialog shell: server error banner, Cancel, Save. Enter submits. */
export function EntityModal({ title, onClose, onSave, saving, error, size = 'md', saveLabel = 'Save', children }: {
  title: string; onClose: () => void; onSave: () => void; saving: boolean; error: string | null
  size?: 'sm' | 'md' | 'lg' | 'xl'; saveLabel?: string; children: ReactNode
}) {
  return (
    <Modal open onClose={onClose} title={title} size={size}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={onSave}>{saveLabel}</Button></>}>
      <form onSubmit={(e) => { e.preventDefault(); onSave() }} className="flex flex-col gap-4" noValidate>
        {children}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  )
}

export function DeleteDialog({ flow, noun, extra }: { flow: DeleteFlow; noun: string; extra?: string }) {
  return (
    <ConfirmDialog open={!!flow.target} danger title={`Delete ${noun}?`} confirmLabel="Delete" loading={flow.pending}
      message={<>Delete <strong>{flow.target?.name}</strong>? {extra ?? 'This cannot be undone.'}</>}
      onConfirm={flow.confirm} onClose={flow.cancel} />
  )
}

export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}
