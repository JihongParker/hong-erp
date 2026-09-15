import { useEffect, useRef } from 'react'
import SeaCanvas from './SeaCanvas'
import GrassFx from './GrassFx'
import PortFx from './PortFx'
import CurrentsFx from './CurrentsFx'
import './SceneBackground.css'

// The whole Overview sits inside one seascape. Up top, an oil-import terminal
// at dawn works behind the headline, built from illustration layers generated
// once (scripts/gen_scene.py) and served as static files: a painted sky that
// slowly pans, sun rays, drifting clouds, gulls, two offshore turbines whose
// rotors turn, the terminal with a flickering flare and an outfall pouring
// water, a tanker riding the swell, mirrored reflections on the water, and
// dune grass swaying in the foreground. The three depth groups follow the
// pointer for parallax. Below the waterline the sea fills the rest of the page.
// Decorative, reduced-motion safe.
const BASE = import.meta.env.BASE_URL + 'scene/'

export default function SceneBackground() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return
    let raf = 0
    const TOP = [133, 171, 202]
    const DEEP = [123, 172, 147]
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement.scrollHeight - window.innerHeight
        const d = Math.min(1, Math.max(0, window.scrollY / (doc || 1)))
        const c = TOP.map((a, i) => Math.round(a + (DEEP[i] - a) * d))
        el.style.setProperty('--sea-deep', `rgb(${c[0]},${c[1]},${c[2]})`)
        el.style.setProperty('--sy', String(Math.min(1, window.scrollY / 600)))
      })
    }
    // pointer parallax: the pointer only sets a target; one rAF loop eases the
    // three depth groups toward it and writes whole-pixel transforms, so the
    // layers never re-rasterise on fractional offsets or restart a transition
    const groups = Array.from(el.querySelectorAll<HTMLElement>('.sc-plx'))
    const depth = [[-10, -6], [12, 4], [30, 10]]
    let tx = 0, ty = 0, cx = 0, cy = 0, praf = 0
    const ease = () => {
      praf = 0
      cx += (tx - cx) * 0.06
      cy += (ty - cy) * 0.06
      const sy = parseFloat(el.style.getPropertyValue('--sy') || '0')
      groups.forEach((g, i) => {
        const [kx, ky] = depth[i] ?? [0, 0]
        g.style.transform = `translate3d(${Math.round(cx * kx)}px, ${Math.round(cy * ky + (i === 0 ? sy * 18 : i === 1 ? sy * 6 : 0))}px, 0)`
      })
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) praf = requestAnimationFrame(ease)
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      tx = (e.clientX / window.innerWidth) * 2 - 1
      ty = (e.clientY / window.innerHeight) * 2 - 1
      if (!praf) praf = requestAnimationFrame(ease)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('pointermove', onMove, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(raf)
      cancelAnimationFrame(praf)
    }
  }, [])

  const turbine = (cls: string) => (
    <div className={`sc-turbine ${cls}`}>
      <img className="sc-tower" src={BASE + 'turbine_tower.webp'} alt="" />
      <img className="sc-rotor" src={BASE + 'turbine_rotor.webp'} alt="" />
    </div>
  )

  return (
    <div className="scene" ref={ref} aria-hidden>
      <div className="scene-stage">
        {/* painted sky, slow pan; dusk variant fades in on the dark theme */}
        <div className="sc-sky">
          <img className="sc-sky-img sc-sky-dawn" src={BASE + 'sky_dawn.webp'} alt="" />
          <img className="sc-sky-img sc-sky-dusk" src={BASE + 'sky_dusk.webp'} alt="" />
        </div>

        {/* depth 1: sun, rays, clouds, gulls */}
        <div className="sc-plx sc-plx-1">
          <span className="sc-rays" />
          <span className="sc-sun" />
          <img className="sc-cloud sc-cloud-a" src={BASE + 'cloud_a.webp'} alt="" />
          <img className="sc-cloud sc-cloud-b" src={BASE + 'cloud_b.webp'} alt="" />
          <img className="sc-cloud sc-cloud-c" src={BASE + 'cloud_a.webp'} alt="" />
          <img className="sc-gull sc-gull-1" src={BASE + 'gull.webp'} alt="" />
          <img className="sc-gull sc-gull-2" src={BASE + 'gull.webp'} alt="" />
          <img className="sc-gull sc-gull-3" src={BASE + 'gull.webp'} alt="" />
        </div>

        <span className="sc-haze" />

        {/* depth 2: the working port */}
        <div className="sc-plx sc-plx-2">
          {turbine('sc-turbine-far')}
          {turbine('sc-turbine-near')}
          <div className="sc-terminal-wrap">
            <img className="sc-terminal" src={BASE + 'terminal.webp'} alt="" />
            <span className="sc-flare" />
          </div>
          <img className="sc-tanker" src={BASE + 'tanker.webp'} alt="" />
          <PortFx />
        </div>

        {/* depth 3: dune grass, swaying */}
        <div className="sc-plx sc-plx-3">
          <GrassFx />
        </div>
      </div>

      {/* animated surf fills the water */}
      <SeaCanvas />

      {/* beneath the surface: light rays and rising bubbles */}
      <div className="scene-life">
        <CurrentsFx />
        <span className="scene-ray scene-ray-1" />
        <span className="scene-ray scene-ray-2" />
        <span className="scene-ray scene-ray-3" />
      </div>
    </div>
  )
}
