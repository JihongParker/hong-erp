import { useRef } from 'react'
import { useFxCanvas } from './sceneFx'

// Beneath the surface: only water. Bubbles of many sizes rise from vents on
// the seabed and from open water, wobble, swell as the pressure drops and pop
// just under the surface; currents show as drifting translucent ribbons and as
// fine suspended particles that leave short trails along a slowly turning flow
// field; rolling light caustics complete it. The canvas is viewport-tall and
// slides down the area to follow the scroll (see UnderwaterFx history: sticky
// does not work inside the clipped, absolutely positioned area).
type Bubble = { x: number; y: number; r: number; v: number; w: number; ph: number; pop: number }
type Mote = { x: number; y: number; tr: number[]; s: number }

const VENTS = [0.12, 0.31, 0.58, 0.83]

export default function CurrentsFx() {
  const bubbles = useRef<Bubble[]>([])
  const motes = useRef<Mote[]>(Array.from({ length: 110 }, () => ({ x: Math.random(), y: Math.random(), tr: [], s: 0.6 + Math.random() * 1.2 })))

  // flow field in area fractions per second: a slow rightward drift bent by
  // two overlapping waves, so water visibly turns rather than sliding
  const flow = (x: number, y: number, t: number) => {
    const u = 0.018 + 0.012 * Math.sin(y * 9.4 + t * 0.21) + 0.006 * Math.cos(x * 12.6 - t * 0.17)
    const v = 0.006 * Math.sin(x * 15.7 + t * 0.26) + 0.004 * Math.cos(y * 20 + t * 0.31)
    return [u, v]
  }

  const ref = useFxCanvas((ctx, W, H, t) => {
    const cv = ctx.canvas
    const area = cv.parentElement as HTMLElement
    const ar = area.getBoundingClientRect()
    const AH = ar.height
    const off = Math.min(Math.max(0, -ar.top), Math.max(0, AH - H))
    cv.style.transform = `translateY(${off}px)`
    const toY = (fy: number) => fy * AH - off
    const dt = 1 / 60

    // ── caustics: soft light blobs rolling across the water
    ctx.globalCompositeOperation = 'lighter'
    for (let i = 0; i < 4; i++) {
      const cx = W * (0.15 + 0.25 * i + 0.1 * Math.sin(t * 0.19 + i * 2.1))
      const cy = H * (0.35 + 0.28 * Math.sin(t * 0.15 + i * 1.4))
      const r = W * (0.2 + 0.05 * Math.sin(t * 0.27 + i))
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      g.addColorStop(0, 'rgba(255,255,255,0.07)')
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2)
    }
    ctx.globalCompositeOperation = 'source-over'

    // ── current ribbons: wide translucent bands with wavy edges drifting right
    for (let i = 0; i < 5; i++) {
      const yc = toY(0.12 + i * 0.19 + 0.02 * Math.sin(t * 0.1 + i))
      if (yc < -120 || yc > H + 120) continue
      const th = 34 + 14 * Math.sin(t * 0.13 + i * 1.9)
      const g = ctx.createLinearGradient(0, yc - th, 0, yc + th)
      g.addColorStop(0, 'rgba(255,255,255,0)')
      g.addColorStop(0.5, `rgba(255,255,255,${0.05 + 0.02 * Math.sin(t * 0.2 + i)})`)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      const ph = t * (18 + 6 * i) + i * 300
      for (let x = -10; x <= W + 10; x += 16) ctx.lineTo(x, yc - th + 10 * Math.sin((x + ph) * 0.012) + 4 * Math.sin((x - ph) * 0.031))
      for (let x = W + 10; x >= -10; x -= 16) ctx.lineTo(x, yc + th + 10 * Math.sin((x + ph) * 0.011 + 1.3) + 4 * Math.sin((x - ph) * 0.029))
      ctx.closePath()
      ctx.fill()
    }

    // ── suspended particles advected by the flow, drawn with short trails
    ctx.lineCap = 'round'
    for (const m of motes.current) {
      const [u, v] = flow(m.x, m.y, t)
      m.x += u * dt
      m.y += v * dt
      if (m.x > 1.02) { m.x = -0.02; m.tr = [] }
      if (m.y < 0) { m.y += 1; m.tr = [] }
      if (m.y > 1) { m.y -= 1; m.tr = [] }
      // trails are kept in area fractions so scrolling never stretches them
      m.tr.push(m.x, m.y)
      if (m.tr.length > 16) m.tr.splice(0, 2)
      const px = W * m.x
      const py = toY(m.y)
      if (py < -20 || py > H + 20 || m.tr.length < 4) continue
      ctx.strokeStyle = `rgba(255,255,255,${0.16 + 0.1 * m.s})`
      ctx.lineWidth = m.s
      ctx.beginPath()
      ctx.moveTo(W * m.tr[0], toY(m.tr[1]))
      for (let k = 2; k < m.tr.length; k += 2) ctx.lineTo(W * m.tr[k], toY(m.tr[k + 1]))
      ctx.stroke()
      ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.2 * m.s})`
      ctx.beginPath()
      ctx.arc(px, py, m.s * 0.9, 0, 6.283)
      ctx.fill()
    }

    // ── bubbles: vents on the seabed spit clusters; open water adds strays
    const B = bubbles.current
    if (B.length < 140) {
      if (Math.random() < 0.35) {
        const vx = VENTS[Math.floor(Math.random() * VENTS.length)]
        B.push({ x: vx + (Math.random() - 0.5) * 0.012, y: 1.0, r: 1.2 + Math.random() * 3.5, v: 0.05 + Math.random() * 0.05, w: 6 + Math.random() * 8, ph: Math.random() * 6.28, pop: 0 })
      }
      if (Math.random() < 0.12) {
        B.push({ x: Math.random(), y: 0.2 + Math.random() * 0.8, r: 0.8 + Math.random() * 6, v: 0.03 + Math.random() * 0.06, w: 4 + Math.random() * 10, ph: Math.random() * 6.28, pop: 0 })
      }
    }
    for (let i = B.length - 1; i >= 0; i--) {
      const b = B[i]
      if (b.pop > 0) {
        b.pop += dt * 6
        if (b.pop > 1) { B.splice(i, 1); continue }
      } else {
        b.y -= (b.v * (0.6 + b.r * 0.12)) * dt // bigger bubbles rise faster
        b.x += flow(b.x, b.y, t)[0] * dt * 0.4
        b.r += 0.6 * dt // swells as the pressure drops
        if (b.y < 0.005) { b.pop = 0.01 }
      }
      const px = W * b.x + Math.sin(t * 2.2 + b.ph) * b.w * (0.4 + b.r * 0.08)
      const py = toY(b.y)
      if (py < -30 || py > H + 30) continue
      if (b.pop > 0) {
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - b.pop)})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(px, py, b.r * (1 + b.pop * 1.6), 0, 6.283)
        ctx.stroke()
        continue
      }
      const squash = 1 + 0.08 * Math.sin(t * 7 + b.ph)
      ctx.save()
      ctx.translate(px, py)
      ctx.scale(squash, 1 / squash)
      const g = ctx.createRadialGradient(-b.r * 0.35, -b.r * 0.35, b.r * 0.1, 0, 0, b.r)
      g.addColorStop(0, 'rgba(255,255,255,0.55)')
      g.addColorStop(0.55, 'rgba(255,255,255,0.08)')
      g.addColorStop(0.92, 'rgba(255,255,255,0.05)')
      g.addColorStop(1, 'rgba(255,255,255,0.42)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(0, 0, b.r, 0, 6.283)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'
      ctx.lineWidth = 0.8
      ctx.stroke()
      ctx.restore()
    }
  })
  return <canvas ref={ref} className="sc-fx sc-fx-under" />
}
