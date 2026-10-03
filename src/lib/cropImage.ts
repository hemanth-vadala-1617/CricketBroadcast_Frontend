export interface CropArea { x: number; y: number; width: number; height: number }

export type CropPresetName = 'teamLogo' | 'logo' | 'playerPhoto' | 'background' | 'watermark' | 'banner'

export interface CropPreset {
  label: string
  /** width / height */
  aspect: number
  /** draw a round guide (the output is still a square image) */
  round?: boolean
  /** longest side of the saved image, in pixels */
  maxSide: number
  /** PNG keeps transparency (logos, cut-outs); JPEG is far smaller for photos/backgrounds */
  type: 'image/png' | 'image/jpeg'
}

/** Sizes follow where the picture is used on the overlay (the player card photo area is 140 x 190). */
export const CROP_PRESETS: Record<CropPresetName, CropPreset> = {
  teamLogo: { label: 'Team logo / flag', aspect: 1, round: true, maxSide: 512, type: 'image/png' },
  logo: { label: 'Logo', aspect: 1, maxSide: 512, type: 'image/png' },
  playerPhoto: { label: 'Player photo', aspect: 140 / 190, maxSide: 760, type: 'image/png' },
  background: { label: 'Background', aspect: 16 / 9, maxSide: 1920, type: 'image/jpeg' },
  watermark: { label: 'Watermark', aspect: 16 / 9, maxSide: 800, type: 'image/png' },
  banner: { label: 'Banner image', aspect: 16 / 9, maxSide: 1280, type: 'image/png' },
}

/** Other ratios the user may switch to inside the crop dialog. */
export const ASPECT_CHOICES: { label: string; value: number }[] = [
  { label: '1:1', value: 1 },
  { label: '3:4', value: 3 / 4 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
]

export interface Selection { unit: 'px' | '%'; x: number; y: number; width: number; height: number }

/**
 * Turns the selection box (pixels of the picture as SHOWN on screen, or percentages of it) into pixels of the
 * ORIGINAL picture, clamped inside it. This is what makes a free-form crop come out exactly as framed.
 */
export function toNaturalArea(sel: Selection, shown: { width: number; height: number }, natural: { width: number; height: number }): CropArea {
  const sx = sel.unit === '%' ? natural.width / 100 : natural.width / shown.width
  const sy = sel.unit === '%' ? natural.height / 100 : natural.height / shown.height
  const x = Math.min(Math.max(0, Math.round(sel.x * sx)), natural.width - 1)
  const y = Math.min(Math.max(0, Math.round(sel.y * sy)), natural.height - 1)
  const width = Math.max(1, Math.min(Math.round(sel.width * sx), natural.width - x))
  const height = Math.max(1, Math.min(Math.round(sel.height * sy), natural.height - y))
  return { x, y, width, height }
}

/** Scales down (never up) so the longest side is at most `max`. */
export function fitOutput(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export function extensionFor(type: string): string {
  return type === 'image/jpeg' ? 'jpg' : 'png'
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('This image could not be read.'))
    img.src = src
  })
}

/** Cuts `area` (in source-image pixels) out of the picture and returns it as a ready-to-upload File. */
export async function cropToFile(src: string, area: CropArea, opts: { maxSide: number; type: CropPreset['type']; baseName: string; quality?: number }): Promise<File> {
  const img = await loadImage(src)
  const { width, height } = fitOutput(area.width, area.height, opts.maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser cannot crop images.')
  if (opts.type === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height) }
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, width, height)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, opts.type, opts.quality ?? 0.9))
  if (!blob) throw new Error('The cropped image could not be created.')
  const name = `${opts.baseName.replace(/\.[^.]+$/, '') || 'image'}.${extensionFor(opts.type)}`
  return new File([blob], name, { type: opts.type })
}
