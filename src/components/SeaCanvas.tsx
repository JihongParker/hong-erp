import { useEffect, useRef } from 'react'
import './SeaCanvas.css'

// Procedural surf on a <canvas>: three parallax swell layers built from summed
// sines, and a front layer that surges up the shore and draws back with a foam
// crest — real rolling water, not moving stripes. Self-contained, theme-aware,
// reduced-motion safe (paints one still frame).
type RGB = [number, number, number]
type Pal = { back: RGB; mid: RGB; front: RGB; foam: RGB }
// blue at the surface, sea-green in the depths — lerped by scroll depth
const LIGHT_TOP: Pal = { back: [174, 205, 227], mid: [139, 176, 208], front: [111, 154, 191], foam: [255, 255, 255] }
const LIGHT_DEEP: Pal = { back: [160, 206, 180], mid: [107, 170, 132], front: [86, 148, 116], foam: [232, 247, 238] }
const DARK_TOP: Pal = { back: [51, 82, 111], mid: [41, 69, 89], front: [31, 53, 71], foam: [188, 211, 230] }
const DARK_DEEP: Pal = { back: [40, 84, 68], mid: [30, 66, 52], front: [22, 48, 40], foam: [180, 214, 196] }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const css = (c: RGB) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`

function layer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  baseY: number,
  amp: number,
  len: number,
  speed: number,
  color: RGB,
  foam?: RGB,
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
  ctx.fillStyle = css(color)
  ctx.fill()
  if (foam) {
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - 2) : ctx.moveTo(x, y - 2)))
    ctx.strokeStyle = css(foam)
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
      const rect = c.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      // depth ratio: blue near the top of the page, green toward the bottom
      const doc = document.documentElement.scrollHeight - window.innerHeight
      const depth = Math.min(1, Math.max(0, window.scrollY / (doc || 1)))
      const dk = isDark()
      const top = dk ? DARK_TOP : LIGHT_TOP
      const deep = dk ? DARK_DEEP : LIGHT_DEEP
      const back = mix(top.back, deep.back, depth)
      const midC = mix(top.mid, deep.mid, depth)
      const front = mix(top.front, deep.front, depth)
      const foam = mix(top.foam, deep.foam, depth)
      ctx.clearRect(0, 0, w, h)
      layer(ctx, w, h, t, h * 0.05, 8, 240, 0.5, back)
      layer(ctx, w, h, t, h * 0.12, 12, 190, 0.78, midC)
      const surge = (Math.sin(t * 0.42) * 0.5 + 0.5) ** 1.4
      const frontBase = h * 0.22 - surge * h * 0.1
      layer(ctx, w, h, t, frontBase, 16, 150, 1.05, front, foam)
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
