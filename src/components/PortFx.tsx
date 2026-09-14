import { img, ready, useFxCanvas } from './sceneFx'

// Water-level effects for the port: mirrored reflections that ripple, the
// outfall stream with highlight streaks, splash droplets and mist, and smoke
// drifting from the flare stack. Geometry mirrors the CSS placement of the
// DOM plates (terminal, tanker, turbine towers) so the reflections line up.
type P = { x: number; y: number; vx: number; vy: number; r: number; a: number; life: number; max: number }
const drops: P[] = []
const smoke: P[] = []

export default function PortFx() {
  const ref = useFxCanvas((ctx, W, H, t) => {
    const mobile = W < 860
    const vw = window.innerWidth / 100
    const wl = H * 0.88
    // plates: [image, left, width, bottom offset (fraction of H below the waterline)]
    const term = img('terminal'), tank = img('tanker'), tower = img('turbine_tower')
    const plates: [HTMLImageElement, number, number, number][] = mobile
      ? [[term, W * 1.06 - W * 0.74, W * 0.74, 0.004], [tank, W * 0.06 + (W * 0.03 * ((t / 120) % 2 > 1 ? 2 - (t / 120) % 2 : (t / 120) % 2)), W * 0.34, 0.014], [tower, W * 0.14, 7 * vw, 0], [tower, W * 0.05, 4.5 * vw, 0]]
      : [[term, W * 0.97 - W * 0.52, W * 0.52, 0.004], [tank, W * 0.24 + (W * 0.03 * ((t / 120) % 2 > 1 ? 2 - (t / 120) % 2 : (t / 120) % 2)), W * 0.2, 0.014], [tower, W * 0.27, 3.6 * vw, 0], [tower, W * 0.2, 2.4 * vw, 0]]

    // ── reflections: mirrored rows with a sideways ripple that grows with depth
    const depth = H - wl
    const row = 2
    for (const [im, x, w, off] of plates) {
      if (!ready(im)) continue
      const h = (w * im.naturalHeight) / im.naturalWidth
      const base = wl + H * off
      const scale = im.naturalHeight / h
      for (let d = 0; d < depth; d += row) {
        const srcY = im.naturalHeight - (d + row) * scale
        if (srcY < 0) break
        const a = 0.3 * (1 - d / depth)
        const dx = Math.sin(d * 0.11 - t * 2.4 + x * 0.01) * (1 + d * 0.06) + Math.sin(d * 0.05 + t * 1.1) * 0.8
        ctx.globalAlpha = a
        ctx.drawImage(im, 0, srcY, im.naturalWidth, row * scale, x + dx, base + d, w, row + 0.6)
      }
    }
    ctx.globalAlpha = 1

    // ── outfall stream
    const water = img('water')
    const wx = mobile ? W * 0.44 : W * 0.505
    const wh = H * 0.14
    if (ready(water)) {
      const ww = (wh * water.naturalWidth) / water.naturalHeight
      const wy = wl + H * 0.008 - wh
      const wob = Math.sin(t * 5.1) * 0.6 + Math.sin(t * 2.3) * 0.4
      ctx.drawImage(water, wx + wob, wy, ww, wh)
      // highlight streaks sliding down the stream
      ctx.save()
      ctx.beginPath()
      ctx.rect(wx + ww * 0.3, wy + wh * 0.12, ww * 0.4, wh * 0.8)
      ctx.clip()
      ctx.lineCap = 'round'
      for (let i = 0; i < 7; i++) {
        const ph = i * 0.37
        const yy = wy + wh * 0.1 + (((t * 1.6 + ph) % 1) * wh * 0.85)
        const xx = wx + ww * (0.38 + 0.24 * ((i * 0.618) % 1)) + Math.sin(t * 3 + i) * 1.2
        ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.25 * Math.sin(t * 4 + i)})`
        ctx.lineWidth = 1.2 + (i % 3) * 0.5
        ctx.beginPath()
        ctx.moveTo(xx, yy)
        ctx.lineTo(xx + 0.4, yy + 9 + (i % 2) * 5)
        ctx.stroke()
      }
      ctx.restore()
      // droplets at the splash
      const bx = wx + ww * 0.5
      const by = wy + wh * 0.95
      if (drops.length < 70 && Math.random() < 0.55) {
        drops.push({ x: bx + (Math.random() - 0.5) * ww * 0.5, y: by, vx: (Math.random() - 0.5) * 60, vy: -(30 + Math.random() * 70), r: 0.8 + Math.random() * 1.6, a: 0.9, life: 0, max: 0.5 + Math.random() * 0.4 })
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const p = drops[i]
        p.life += 1 / 60
        p.vy += 260 / 60
        p.x += p.vx / 60
        p.y += p.vy / 60
        if (p.life > p.max || p.y > by + 6) { drops.splice(i, 1); continue }
        ctx.globalAlpha = p.a * (1 - p.life / p.max)
        ctx.fillStyle = '#f4fbff'
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, 6.283)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      // mist
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, ww * 0.9)
      g.addColorStop(0, `rgba(255,255,255,${0.22 + 0.08 * Math.sin(t * 2.2)})`)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.fillRect(bx - ww, by - ww * 0.5, ww * 2, ww)
    }

    // ── smoke from the flare stack (68.9%, 16% of the terminal plate)
    if (ready(term)) {
      const [, tx, tw] = plates[0]
      const th = (tw * term.naturalHeight) / term.naturalWidth
      const base = wl + H * 0.004
      const fx = tx + tw * 0.689
      const fy = base - th + th * 0.16
      if (smoke.length < 40 && Math.random() < 0.18) {
        smoke.push({ x: fx + (Math.random() - 0.5) * 3, y: fy - 6, vx: 6 + Math.random() * 10, vy: -(9 + Math.random() * 6), r: 2 + Math.random() * 2, a: 0.22, life: 0, max: 5 + Math.random() * 3 })
      }
      for (let i = smoke.length - 1; i >= 0; i--) {
        const p = smoke[i]
        p.life += 1 / 60
        p.x += (p.vx + Math.sin(t * 0.8 + p.y * 0.05) * 4) / 60
        p.y += p.vy / 60
        p.r += 2.2 / 60
        if (p.life > p.max) { smoke.splice(i, 1); continue }
        const k = p.life / p.max
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r)
        g.addColorStop(0, `rgba(210,214,220,${p.a * (1 - k) * 0.9})`)
        g.addColorStop(1, 'rgba(210,214,220,0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, 6.283)
        ctx.fill()
      }
    }
  })
  return <canvas ref={ref} className="sc-fx sc-fx-port" />
}
