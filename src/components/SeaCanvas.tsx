import { useEffect, useRef } from 'react'
import './SeaCanvas.css'

// Procedural surf on a <canvas>: three parallax swell layers built from summed
// sines, and a front layer that surges up the shore and draws back with a foam
// crest — real rolling water, not moving stripes. Self-contained, theme-aware,
// reduced-motion safe (paints one still frame).
type Pal = { back: string; mid: string; front: string; foam: string }
const LIGHT: Pal = { back: '#aecde3', mid: '#8bb0d0', front: '#6f9abf', foam: '#ffffff' }
const DARK: Pal = { back: '#33526f', mid: '#294559', front: '#1f3547', foam: '#bcd3e6' }

function layer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  baseY: number,
  amp: number,
  len: number,
  speed: number,
  color: string,
  foam?: string,
) {
  const pts: [number, number][] = []
  ctx.beginPath()
  ctx.moveTo(0, h)
  ctx.lineTo(0, baseY)
  for (let x = 0; x <= w; x += 6) {
    const y =
      baseY +
      Math.sin(x / len + t * speed) * amp +
      Math.sin(x / (len * 0.46) + t * speed * 1.6) * amp * 0.4
    ctx.lineTo(x, y)
    pts.push([x, y])
  }
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = color
  ctx.fill()
  if (foam) {
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 2) : ctx.moveTo(x, y - 2)))
    ctx.strokeStyle = foam
    ctx.globalAlpha = 0.55
    ctx.lineWidth = 2.5
    ctx.stroke()
    ctx.globalAlpha = 1
  }
}

export default function SeaCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isDark = () => {
      const th = document.documentElement.dataset.theme
      if (th) return th === 'dark'
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }

    let raf = 0
    const t0 = performance.now()
    const resize = () => {
      const r = c.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      c.width = Math.max(1, Math.round(r.width * dpr))
      c.height = Math.max(1, Math.round(r.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const frame = (now: number) => {
      const t = (now - t0) / 1000
      const r = c.getBoundingClientRect()
      const w = r.width
      const h = r.height
      const p = isDark() ? DARK : LIGHT
      ctx.clearRect(0, 0, w, h)
      // water surface sits near the top of the canvas (the horizon); the rest
      // fills down as open water
      layer(ctx, w, h, t, h * 0.05, 8, 240, 0.5, p.back)
      layer(ctx, w, h, t, h * 0.12, 12, 190, 0.78, p.mid)
      // the front sheet surges up and draws back, foam riding its crest
      const surge = (Math.sin(t * 0.42) * 0.5 + 0.5) ** 1.4
      const frontBase = h * 0.22 - surge * h * 0.1
      layer(ctx, w, h, t, frontBase, 16, 150, 1.05, p.front, p.foam)
      if (!reduce) raf = requestAnimationFrame(frame)
    }
    if (reduce) frame(performance.now())
    else raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="seacanvas" aria-hidden />
}
