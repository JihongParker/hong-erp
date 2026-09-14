import { img, drawSway, wind, useFxCanvas } from './sceneFx'

// Dune grass in the foreground corners, bent by a travelling wind. Each clump
// has its own phase so gusts arrive at different moments.
const CLUMPS = [
  { im: 'grass_a', x: -0.03, w: 0.15, dy: 0.06, ph: 0.0, flip: false },
  { im: 'grass_b', x: 0.07, w: 0.11, dy: 0.07, ph: 1.9, flip: true },
  { im: 'grass_b', x: 0.89, w: 0.13, dy: 0.06, ph: 3.4, flip: false },
  { im: 'grass_a', x: 0.82, w: 0.1, dy: 0.07, ph: 5.1, flip: true },
]
const MOBILE = [
  { im: 'grass_a', x: -0.06, w: 0.34, dy: 0.06, ph: 0.0, flip: false },
  { im: 'grass_b', x: 0.72, w: 0.3, dy: 0.06, ph: 3.4, flip: false },
]

export default function GrassFx() {
  const ref = useFxCanvas((ctx, W, H, t, dpr) => {
    const wl = H * 0.88
    const list = W < 860 ? MOBILE : CLUMPS
    for (const c of list) {
      const im = img(c.im)
      if (!im.naturalWidth) continue
      const w = W * c.w
      const h = (w * im.naturalHeight) / im.naturalWidth
      const y = wl + H * c.dy - h
      drawSway(ctx, dpr, im, W * c.x, y, w, h, (u) => wind(u, t, c.ph), 40, c.flip)
    }
  })
  return <canvas ref={ref} className="sc-fx sc-fx-grass" />
}
