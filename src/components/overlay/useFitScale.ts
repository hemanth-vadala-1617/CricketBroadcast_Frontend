import { useEffect, useState } from 'react'

export const CANVAS_W = 1920
export const CANVAS_H = 1080

function compute() {
  if (typeof window === 'undefined') return 1
  return Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H)
}

/** Scale that fits the 1920x1080 canvas into the window, keeping the aspect ratio. */
export function useFitScale(): number {
  const [scale, setScale] = useState(compute)
  useEffect(() => {
    const onResize = () => setScale(compute())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return scale
}
