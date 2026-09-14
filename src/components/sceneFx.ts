// Shared helpers for the canvas-driven scene effects (grass, port, underwater).
// Everything here is decorative: it degrades to one static frame when the user
// prefers reduced motion, and it stops drawing while off-screen or hidden.
import { useEffect, useRef } from 'react'

export const BASE = import.meta.env.BASE_URL + 'scene/'

const cache = new Map<string, HTMLImageElement>()
export function img(name: string): HTMLImageElement {
  let im = cache.get(name)
  if (!im) {
    im = new Image()
    im.src = BASE + name + '.webp'
    cache.set(name, im)
  }
  return im
}
export const ready = (im: HTMLImageElement) => im.complete && im.naturalWidth > 0

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Draw `im` into (x, y, w, h) sliced into vertical strips; each strip is
// sheared so points move sideways in proportion to their height above the
// base line (y + h). shear(u) returns the shear ratio for strip u in [0, 1].
export function drawSway(
  ctx: CanvasRenderingContext2D,
  dpr: number,
  im: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  shear: (u: number) => number,
  strips = 36,
  flip = false,
) {
  if (!ready(im)) return
  const sw = im.naturalWidth / strips
  const dw = w / strips
  const base = y + h
  for (let i = 0; i < strips; i++) {
    const u = (i + 0.5) / strips
    const k = shear(u)
    const dx = x + i * dw
    ctx.setTransform(dpr, 0, dpr * k, dpr, -dpr * k * base, 0)
    const si = flip ? strips - 1 - i : i
    ctx.drawImage(im, si * sw, 0, sw, im.naturalHeight, dx, y, dw + 0.8, h)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

// Layered sine wind: a slow travelling wave, a faster ripple, and a gust
// envelope. Returns the shear ratio for a point u across the clump at time t.
export function wind(u: number, t: number, phase: number, amp = 0.09) {
  const gust = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.33 + phase * 2.1), 2)
  return (
    amp *
    gust *
    (0.62 * Math.sin(2 * Math.PI * (u * 1.15 - t * 0.28) + phase) +
      0.28 * Math.sin(2 * Math.PI * (u * 2.9 - t * 0.71) + phase * 1.7) +
      0.1 * Math.sin(t * 2.3 + u * 9 + phase))
  )
}

// rAF loop bound to a canvas that follows its parent's size; paused when the
// canvas is off-screen or the tab is hidden. `draw(ctx, W, H, t, dpr)` is
// called in CSS pixels with the DPR transform already applied.
export function useFxCanvas(
  draw: (ctx: CanvasRenderingContext2D, W: number, H: number, t: number, dpr: number) => void,
  deps: unknown[] = [],
) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const still = reducedMotion()
    let W = 0
    let H = 0
    let dpr = 1
    let raf = 0
    let visible = true
    let last = performance.now()
    let t = 0
    const size = () => {
      const r = cv.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = Math.max(1, Math.round(r.width))
      H = Math.max(1, Math.round(r.height))
      cv.width = Math.round(W * dpr)
      cv.height = Math.round(H * dpr)
    }
    const frame = (now: number) => {
      raf = 0
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      draw(ctx, W, H, t, dpr)
      if (!still && visible && !document.hidden) raf = requestAnimationFrame(frame)
    }
    const kick = () => {
      if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(frame)
      }
    }
    size()
    const ro = new ResizeObserver(() => {
      size()
      kick()
    })
    ro.observe(cv.parentElement ?? cv)
    const io = new IntersectionObserver((es) => {
      visible = es.some((e) => e.isIntersecting)
      if (visible) kick()
    })
    io.observe(cv)
    const onVis = () => kick()
    document.addEventListener('visibilitychange', onVis)
    // images may arrive after the first frame; redraw once each lands
    const onLoad = () => kick()
    for (const im of cache.values()) im.addEventListener('load', onLoad)
    kick()
    return () => {
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      for (const im of cache.values()) im.removeEventListener('load', onLoad)
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}
