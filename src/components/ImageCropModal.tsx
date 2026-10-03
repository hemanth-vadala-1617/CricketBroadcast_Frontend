import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop, type Crop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Button, Modal } from './ui'
import { ASPECT_CHOICES, CROP_PRESETS, cropToFile, toNaturalArea, type CropPresetName } from '../lib/cropImage'
import { cn } from '../lib/utils'

interface Props {
  file: File
  preset: CropPresetName
  onCancel: () => void
  /** The cropped file, ready to upload. */
  onConfirm: (cropped: File) => Promise<void> | void
  /** Skip cropping and upload the picture exactly as chosen. */
  onUseOriginal: () => Promise<void> | void
}

const MIN_PX = 16
const CHECKER = 'repeating-conic-gradient(#cbd5e1 0 25%, #f8fafc 0 50%) 0 0 / 20px 20px'

/** Drag the box and its handles to select ANY rectangle (free ratio), or lock a ratio with the chips. */
export default function ImageCropModal({ file, preset, onCancel, onConfirm, onUseOriginal }: Props) {
  const cfg = CROP_PRESETS[preset]
  const imgRef = useRef<HTMLImageElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [aspect, setAspect] = useState<number | undefined>(undefined)     // undefined = free
  const [dark, setDark] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function onLoad(e: SyntheticEvent<HTMLImageElement>) {
    // start with most of the picture selected, free to resize from there
    setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 })
    void e
  }

  function chooseAspect(value: number | undefined) {
    setAspect(value)
    const img = imgRef.current
    if (!value || !img) return
    setCrop(centerCrop(makeAspectCrop({ unit: '%', width: 80 }, value, img.width, img.height), img.width, img.height))
  }

  const img = imgRef.current
  const area = crop && img && crop.width > 0 && crop.height > 0
    ? toNaturalArea(crop, { width: img.width, height: img.height }, { width: img.naturalWidth, height: img.naturalHeight })
    : null
  const tooSmall = !area || area.width < MIN_PX || area.height < MIN_PX
  const round = !!cfg.round && aspect === 1

  async function confirm() {
    if (!src || !area || tooSmall) return
    setBusy(true); setError('')
    try {
      const cropped = await cropToFile(src, area, { maxSide: cfg.maxSide, type: cfg.type, baseName: file.name })
      await onConfirm(cropped)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not crop this image.')
      setBusy(false)
    }
  }

  async function original() {
    setBusy(true); setError('')
    try { await onUseOriginal() } catch (e) { setError(e instanceof Error ? e.message : 'Upload failed.'); setBusy(false) }
  }

  const chip = (active: boolean) => cn('rounded-md border px-2.5 py-1 text-xs font-semibold',
    active ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50')

  return (
    <Modal open onClose={busy ? () => undefined : onCancel} title={`Crop · ${cfg.label}`} size="lg"
      footer={<>
        <Button variant="ghost" disabled={busy} onClick={() => void original()}>Use original</Button>
        <Button variant="secondary" disabled={busy} onClick={onCancel}>Cancel</Button>
        <Button loading={busy} disabled={tooSmall} onClick={() => void confirm()}>Crop &amp; upload</Button>
      </>}>
      <div className="flex flex-col gap-4">
        <div data-testid="crop-area" className="grid max-h-[60vh] place-items-center overflow-auto rounded-lg p-3"
          style={{ background: dark ? '#0f172a' : CHECKER }}>
          {src && (
            <ReactCrop crop={crop} onChange={(c) => setCrop(c)} aspect={aspect} circularCrop={round} ruleOfThirds keepSelection minWidth={MIN_PX} minHeight={MIN_PX}>
              <img ref={imgRef} src={src} alt="Picture to crop" onLoad={onLoad} style={{ maxHeight: '52vh', maxWidth: '100%', display: 'block' }} />
            </ReactCrop>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div role="group" aria-label="Crop shape" className="flex flex-wrap items-center gap-1">
            <button type="button" aria-pressed={aspect === undefined} onClick={() => chooseAspect(undefined)} className={chip(aspect === undefined)}>Free</button>
            {ASPECT_CHOICES.map((c) => (
              <button key={c.label} type="button" aria-pressed={aspect === c.value} onClick={() => chooseAspect(c.value)} className={chip(aspect === c.value)}>{c.label}</button>
            ))}
            <button type="button" aria-pressed={aspect === cfg.aspect} onClick={() => chooseAspect(cfg.aspect)} className={chip(aspect === cfg.aspect)}>Suggested for {cfg.label.toLowerCase()}</button>
          </div>
          <div role="group" aria-label="Preview background" className="ml-auto flex items-center gap-1">
            <span className="text-xs text-slate-500">Background</span>
            <button type="button" aria-pressed={!dark} onClick={() => setDark(false)} className={chip(!dark)}>Light</button>
            <button type="button" aria-pressed={dark} onClick={() => setDark(true)} className={chip(dark)}>Dark</button>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Drag the box or its corners and edges to select exactly what you need. It is saved at up to {cfg.maxSide}px{cfg.type === 'image/png' ? ', transparency kept' : ''}
          {area ? ` · selected ${area.width} × ${area.height}px` : ''}.
          {tooSmall && area ? ' The selection is too small.' : ''}
        </p>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  )
}
