import { lazy, Suspense, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ChangeEvent, type InputHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { Loader2, MoreVertical, Search, Upload, X } from 'lucide-react'
import { cn, assetUrl, caretAfterDigits, contrastText, formatIndianNumber, initials, parseWholeNumber } from '../lib/utils'
import { api, errorMessage } from '../lib/api'
import { CROP_PRESETS, type CropPresetName } from '../lib/cropImage'
import { ErrorBoundary } from './ErrorBoundary'
import { toast, useToast } from '../store/useToast'
import type { MatchStatus, TeamLite } from '../lib/types'

// ---------- buttons ----------
type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning'
const variants: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark focus-visible:outline-brand',
  secondary: 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-slate-600 hover:bg-slate-100',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  warning: 'bg-amber-500 text-white hover:bg-amber-600',
}
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: Variant; size?: 'sm' | 'md' | 'lg'; loading?: boolean }
export function Button({ variant = 'primary', size = 'md', loading, className, children, disabled, ...rest }: ButtonProps) {
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      className={cn('inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50', variants[variant], sizes[size], className)}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

// ---------- form fields ----------
const fieldBase = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:bg-slate-100'

export function Field({ label, error, hint, children, className }: { label: string; error?: string; hint?: string; children: (id: string) => ReactNode; className?: string }) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      {children(id)}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) { return <input {...rest} className={cn(fieldBase, className)} /> }
/**
 * Whole-number field: digits only, no leading zeros ("033500" becomes 33,500), Indian grouping while typing
 * (1,00,000), caret stays where the user is typing. Clearing the box is allowed until the field loses focus.
 */
export function NumberInput({ value, onValueChange, min = 0, max, grouped = true, className, onBlur, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'min' | 'max'> & {
  value: number; onValueChange: (n: number) => void; min?: number; max?: number; grouped?: boolean
}) {
  const [cleared, setCleared] = useState(false)
  const ref = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  const show = (n: number) => (grouped ? formatIndianNumber(n) : String(Math.trunc(n)))

  useLayoutEffect(() => {
    if (caret.current !== null && ref.current) { ref.current.setSelectionRange(caret.current, caret.current); caret.current = null }
  })

  function change(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    const before = raw.slice(0, e.target.selectionStart ?? raw.length).replace(/\D/g, '').length
    const n = parseWholeNumber(raw, max)
    if (n === null) { setCleared(true); onValueChange(min); return }
    setCleared(false)
    onValueChange(n)
    caret.current = caretAfterDigits(show(n), before)
  }

  return (
    <input
      {...rest} ref={ref} type="text" inputMode="numeric" autoComplete="off" value={cleared ? '' : show(value)}
      onChange={change}
      onBlur={(e) => { setCleared(false); if (value < min) onValueChange(min); onBlur?.(e) }}
      className={cn(fieldBase, className)}
    />
  )
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...rest} className={cn(fieldBase, className)}>{children}</select> }
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea {...rest} className={cn(fieldBase, 'min-h-24', className)} /> }

export function Checkbox({ label, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn('inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700', className)}>
      <input type="checkbox" {...rest} className="size-4 rounded border-slate-300 text-brand focus:ring-brand" />
      {label}
    </label>
  )
}

/** Search input. Rule: in every filter bar the search box goes FIRST (leftmost). */
export function SearchBox({ value, onChange, placeholder = 'Search…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  return (
    <div className={cn('relative min-w-56 flex-1', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className={cn(fieldBase, 'pl-9')} />
    </div>
  )
}

/** Container for filters. Children order is the caller's job: SearchBox, selects, Clear, then actions. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">{children}</div>
}

export function ColorField({ value, onChange, label }: { value: string | null; onChange: (v: string) => void; label: string }) {
  return (
    <Field label={label}>
      {(id) => (
        <div className="flex items-center gap-2">
          <input id={id} type="color" value={value && /^#[0-9a-f]{6}$/i.test(value) ? value : '#cccccc'} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-slate-300 bg-white p-0.5" />
          <span className="font-mono text-xs text-slate-500">{value ?? '—'}</span>
        </div>
      )}
    </Field>
  )
}

const ImageCropModal = lazy(() => import('./ImageCropModal'))

/**
 * Picks an image, lets the user crop it to the right shape (preset), then uploads the result.
 * Pass preset={null} to upload exactly as chosen. Animated GIFs are never cropped (a crop would flatten them).
 */
export function ImageUpload({ label, value, onChange, hint, preset = 'logo' }: {
  label: string; value: string | null; onChange: (url: string | null) => void; hint?: string; preset?: CropPresetName | null
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [pending, setPending] = useState<File | null>(null)

  async function upload(file: File) {
    setBusy(true)
    try { onChange(await api.upload(file)); setPending(null) } catch (e) { toast.error(errorMessage(e)); throw e } finally { setBusy(false) }
  }
  function pick(file: File | undefined) {
    if (input.current) input.current.value = ''
    if (!file) return
    if (!preset || file.type === 'image/gif') void upload(file).catch(() => undefined)
    else setPending(file)
  }
  return (
    <Field label={label} hint={hint ?? (preset ? `You can crop and zoom after choosing a picture. ${CROP_PRESETS[preset].label}: ${CROP_PRESETS[preset].type === 'image/png' ? 'transparent PNG works best.' : 'saved as a JPEG.'}` : 'PNG, JPEG, WebP or GIF, up to 5 MB.')}>
      {() => (
        <div className="flex items-center gap-3">
          <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-dashed border-slate-300 bg-[repeating-conic-gradient(#e2e8f0_0_25%,#fff_0_50%)] bg-[length:12px_12px]">
            {value ? <img src={assetUrl(value)} alt="" className="max-h-full max-w-full object-contain" /> : <Upload className="size-5 text-slate-400" aria-hidden />}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" loading={busy} onClick={() => input.current?.click()}>{value ? 'Replace' : 'Upload'}</Button>
            {value && <Button size="sm" variant="ghost" onClick={() => onChange(null)}>Remove</Button>}
          </div>
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          {pending && preset && (
            <ErrorBoundary fallback={(err) => (
              <Modal open onClose={() => setPending(null)} title="Cropping is unavailable" size="sm"
                footer={<><Button variant="secondary" onClick={() => setPending(null)}>Cancel</Button><Button loading={busy} onClick={() => void upload(pending).catch(() => undefined)}>Upload original</Button></>}>
                <p className="text-sm text-slate-600">The crop tool could not be loaded. Reload the page to fix it, or upload the picture as it is.</p>
                <pre className="mt-2 max-h-24 overflow-auto rounded bg-slate-100 p-2 text-xs text-slate-700">{err.message}</pre>
              </Modal>
            )}>
              <Suspense fallback={null}>
                <ImageCropModal file={pending} preset={preset} onCancel={() => setPending(null)}
                  onConfirm={(cropped) => upload(cropped)} onUseOriginal={() => upload(pending)} />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
      )}
    </Field>
  )
}

// ---------- layout ----------
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return <div role="status" className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500"><Loader2 className="size-4 animate-spin" aria-hidden />{label}</div>
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-center">
      <p className="font-semibold text-slate-700">{title}</p>
      {hint && <p className="max-w-md text-sm text-slate-500">{hint}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="m-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <span>{message}</span>
      {onRetry && <Button size="sm" variant="secondary" onClick={onRetry}>Retry</Button>}
    </div>
  )
}

const tones = {
  gray: 'bg-slate-100 text-slate-700 border-slate-200',
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  red: 'bg-red-100 text-red-800 border-red-200',
  amber: 'bg-amber-100 text-amber-800 border-amber-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  purple: 'bg-purple-100 text-purple-800 border-purple-200',
}
export function Badge({ tone = 'gray', children, className }: { tone?: keyof typeof tones; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', tones[tone], className)}>{children}</span>
}

const statusTone: Record<MatchStatus, keyof typeof tones> = {
  Scheduled: 'gray', TossCompleted: 'blue', Live: 'green', InningsBreak: 'amber', RainDelay: 'amber', Paused: 'amber',
  Completed: 'purple', Abandoned: 'red', Cancelled: 'red',
}
const statusLabel: Record<MatchStatus, string> = {
  Scheduled: 'Scheduled', TossCompleted: 'Toss done', Live: 'LIVE', InningsBreak: 'Innings break', RainDelay: 'Rain delay',
  Paused: 'Paused', Completed: 'Completed', Abandoned: 'Abandoned', Cancelled: 'Cancelled',
}
export function StatusBadge({ status }: { status: MatchStatus }) {
  return <Badge tone={statusTone[status]}>{status === 'Live' && <span className="mr-1.5 size-1.5 animate-pulse rounded-full bg-emerald-600" aria-hidden />}{statusLabel[status]}</Badge>
}

export function TeamBadge({ team, size = 32 }: { team: Pick<TeamLite, 'name' | 'shortName' | 'logoUrl' | 'primaryColor'>; size?: number }) {
  const logo = assetUrl(team.logoUrl)
  if (logo) return <img src={logo} alt={team.name} width={size} height={size} className="shrink-0 rounded-full object-contain" style={{ width: size, height: size }} />
  const bg = team.primaryColor ?? '#64748b'
  return (
    <span aria-label={team.name} className="grid shrink-0 place-items-center rounded-full text-[10px] font-bold" style={{ width: size, height: size, background: bg, color: contrastText(bg) }}>
      {team.shortName.slice(0, 3)}
    </span>
  )
}

export function Avatar({ name, src, size = 32 }: { name: string; src?: string | null; size?: number }) {
  const url = assetUrl(src)
  if (url) return <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  return <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-slate-200 text-[11px] font-bold text-slate-600" style={{ width: size, height: size }}>{initials(name)}</span>
}

// ---------- overlays ----------
const openModals: symbol[] = []

export function Modal({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    // Escape closes only the TOPMOST dialog (the crop dialog opens on top of the edit form).
    const token = Symbol('modal')
    openModals.push(token)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && openModals[openModals.length - 1] === token) onClose() }
    document.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      openModals.splice(openModals.indexOf(token), 1)
    }
  }, [open, onClose])
  if (!open) return null
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size]
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:p-8" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={cn('w-full rounded-xl bg-white shadow-xl outline-none', width)}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-slate-500 hover:bg-slate-100"><X className="size-5" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, loading, onConfirm, onClose }: {
  open: boolean; title: string; message: ReactNode; confirmLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onClose: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" footer={<>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
    </>}>
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  )
}

export function Toaster() {
  const items = useToast((s) => s.items)
  const dismiss = useToast((s) => s.dismiss)
  const tone = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-slate-800' }
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {items.map((t) => (
        <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'} className={cn('pointer-events-auto flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg', tone[t.tone])}>
          <span>{t.message}</span>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss" className="opacity-80 hover:opacity-100"><X className="size-4" /></button>
        </div>
      ))}
    </div>
  )
}

// ---------- table ----------
export function Table({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">{head}</thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  )
}
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => <th className={cn('px-4 py-3 font-semibold', className)}>{children}</th>
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => <td className={cn('px-4 py-3 align-middle', className)}>{children}</td>

// ---------- three-dots action menu ----------
export interface ActionMenuItem {
  label: string
  icon?: ReactNode
  onSelect?: () => void
  danger?: boolean
  hidden?: boolean
}

const MENU_ITEM_H = 40
const MENU_PAD = 8

// One menu for every list row (View / Edit / Delete ...). The popup is portalled to <body> with fixed
// positioning, so a table's overflow-x-auto can never clip it, and it flips upward near the screen bottom.
export function ActionMenu({ label, items }: { label: string; items: ActionMenuItem[] }) {
  const visible = items.filter((i) => !i.hidden)
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<{ right: number; top?: number; bottom?: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const count = visible.length

  const close = useCallback((refocus: boolean) => {
    setOpen(false)
    if (refocus) button.current?.focus()
  }, [])

  function toggle() {
    if (open) return close(true)
    const rect = button.current?.getBoundingClientRect()
    if (!rect) return
    const height = count * MENU_ITEM_H + MENU_PAD
    const flip = window.innerHeight - rect.bottom < height + 8 && rect.top > height + 8
    const right = Math.max(8, window.innerWidth - rect.right)
    setPlace(flip ? { right, bottom: window.innerHeight - rect.top + 4 } : { right, top: rect.bottom + 4 })
    setOpen(true)
  }

  // while open: Escape closes only this menu (it sits on top of the shared dialog stack), outside click,
  // scrolling or resizing closes it, and the first item takes focus
  useEffect(() => {
    if (!open) return
    const token = Symbol('menu')
    openModals.push(token)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && openModals[openModals.length - 1] === token) close(true)
    }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (!menu.current?.contains(t) && !button.current?.contains(t)) close(false)
    }
    const away = () => close(false)
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', away)
    window.addEventListener('scroll', away, true)
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', away)
      window.removeEventListener('scroll', away, true)
      openModals.splice(openModals.indexOf(token), 1)
    }
  }, [open, close])

  function onMenuKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    const nodes = Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const at = nodes.indexOf(document.activeElement as HTMLElement)
    const go = (i: number) => { e.preventDefault(); nodes[(i + nodes.length) % nodes.length]?.focus() }
    if (e.key === 'ArrowDown') go(at + 1)
    else if (e.key === 'ArrowUp') go(at - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(nodes.length - 1)
    else if (e.key === 'Tab') close(false)
  }

  if (count === 0) return null
  return (
    <>
      <button
        ref={button} type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={toggle}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); toggle() } }}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        <MoreVertical className="size-5" aria-hidden />
      </button>
      {open && place && createPortal(
        <div
          ref={menu} role="menu" aria-label={label} onKeyDown={onMenuKey}
          style={{ position: 'fixed', right: place.right, top: place.top, bottom: place.bottom }}
          className="z-[70] min-w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
        >
          {visible.map((item) => (
            <button
              key={item.label} type="button" role="menuitem" tabIndex={-1}
              onClick={() => { close(true); item.onSelect?.() }}
              className={cn('flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium outline-none hover:bg-slate-100 focus:bg-slate-100', item.danger ? 'text-red-600' : 'text-slate-700')}
            >
              {item.icon}{item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  )
}

// Long text kept to ONE line with an ellipsis; hovering (or keyboard focus) shows the full text in a tooltip.
// Use it in table cells so a long tournament or venue name never turns a row into a tall column of words.
export function Truncate({ text, max = 'max-w-[12rem]', className, empty = '—', focusable = true }: { text: string | null | undefined; max?: string; className?: string; empty?: string; focusable?: boolean }) {
  const value = text?.trim()
  if (!value) return <span className="text-slate-400">{empty}</span>
  return <span title={value} tabIndex={focusable ? 0 : undefined} className={cn('block truncate rounded-sm focus-visible:outline-2 focus-visible:outline-brand', max, className)}>{value}</span>
}