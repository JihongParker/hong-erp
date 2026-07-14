import { useEffect, useRef } from 'react'
import './Backdrop.css'

// Ambient ESG scenery — a consistent thin-line illustration set (wind turbine
// with slowly spinning blades, leaf sprigs, an oil pump jack, a CO₂ molecule,
// circular-economy arrows, waves, a sprout, sun) drifting behind the content.
// Interaction: depth parallax on mouse move + proximity "wake" — shapes near
// the cursor gently scale up and sharpen. Decorative only: fixed, no pointer
// events, hidden from the a11y tree, stilled under prefers-reduced-motion.

type Kind = 'turbine' | 'leaf' | 'pump' | 'co2' | 'cycle' | 'waves' | 'sprout' | 'sun'

const GREEN = '#237a55'
const BLUE = '#2f6db4'
const AMBER = '#b3610f'

const SHAPES: { kind: Kind; x: number; y: number; size: number; depth: number; dur: number; hue: string; flip?: boolean }[] = [
  { kind: 'turbine', x: 86, y: 8, size: 110, depth: 16, dur: 23, hue: GREEN },
  { kind: 'turbine', x: 76, y: 16, size: 66, depth: 26, dur: 19, hue: GREEN },
  { kind: 'leaf', x: 6, y: 64, size: 110, depth: 12, dur: 21, hue: GREEN },
  { kind: 'pump', x: 66, y: 78, size: 130, depth: 10, dur: 25, hue: AMBER },
  { kind: 'co2', x: 40, y: 10, size: 96, depth: 22, dur: 18, hue: BLUE },
  { kind: 'cycle', x: 90, y: 46, size: 78, depth: 28, dur: 22, hue: GREEN },
  { kind: 'waves', x: 12, y: 88, size: 150, depth: 8, dur: 17, hue: BLUE },
  { kind: 'sprout', x: 30, y: 42, size: 64, depth: 30, dur: 20, hue: GREEN },
  { kind: 'sun', x: 55, y: 58, size: 70, depth: 24, dur: 24, hue: AMBER },
  { kind: 'leaf', x: 48, y: 84, size: 74, depth: 18, dur: 26, hue: GREEN, flip: true },
  { kind: 'waves', x: 78, y: 30, size: 96, depth: 20, dur: 19, hue: BLUE },
]

function Icon({ kind, flip }: { kind: Kind; flip?: boolean }) {
  const common = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  const g = flip ? { transform: 'scale(-1,1)', style: { transformOrigin: 'center' } } : {}

  if (kind === 'turbine')
    return (
      <svg viewBox="0 0 64 104" aria-hidden>
        <g {...g}>
          <path d="M30.6 38 L33.4 38 L35 98 L29 98 Z" fill="currentColor" stroke="none" opacity="0.85" />
          <path d="M18 98 Q32 94 46 98" {...common} opacity="0.6" />
          <g className="bd-blades">
            <path d="M32 30.5 C29.4 22 29.4 10 32 3 C34.6 10 34.6 22 32 30.5 Z" fill="currentColor" stroke="none" />
            <path d="M32 30.5 C29.4 22 29.4 10 32 3 C34.6 10 34.6 22 32 30.5 Z" fill="currentColor" stroke="none" transform="rotate(120 32 32)" />
            <path d="M32 30.5 C29.4 22 29.4 10 32 3 C34.6 10 34.6 22 32 30.5 Z" fill="currentColor" stroke="none" transform="rotate(240 32 32)" />
          </g>
          <circle cx="32" cy="32" r="4.2" fill="currentColor" stroke="none" />
        </g>
      </svg>
    )

  if (kind === 'leaf')
    return (
      <svg viewBox="0 0 72 72" aria-hidden>
        <g {...g}>
          <path d="M12 64 C22 48 34 32 60 12" {...common} />
          <path d="M24 47 C15 46 9 40 8 31 C17 32 23 38 24 47 Z" fill="currentColor" stroke="none" opacity="0.8" />
          <path d="M33 36 C33 27 38 19 47 16 C47 25 42 33 33 36 Z" fill="currentColor" stroke="none" opacity="0.55" />
          <path d="M42 27 C34 25 29 19 28 11 C36 13 41 19 42 27 Z" fill="currentColor" stroke="none" opacity="0.8" />
          <path d="M52 18 C52 11 56 5 62 2 C62 9 58 15 52 18 Z" fill="currentColor" stroke="none" opacity="0.55" />
        </g>
      </svg>
    )

  if (kind === 'pump')
    return (
      <svg viewBox="0 0 96 68" aria-hidden>
        <g {...g}>
          <path d="M28 60 L44 28 L60 60" {...common} />
          <path d="M35 46 L53 46" {...common} />
          <path d="M14 26 L76 34" {...common} strokeWidth={3.4} />
          <circle cx="13" cy="25" r="6.5" {...common} />
          <path d="M76 30 L84 33 L76 40 Z" fill="currentColor" stroke="none" />
          <path d="M80 40 L80 54" {...common} />
          <path d="M18 60 L88 60" {...common} opacity="0.6" />
          <path d="M44 28 L44 22" {...common} />
        </g>
      </svg>
    )

  if (kind === 'co2')
    return (
      <svg viewBox="0 0 88 48" aria-hidden>
        <circle cx="44" cy="24" r="10" {...common} />
        <circle cx="13" cy="24" r="7" {...common} />
        <circle cx="75" cy="24" r="7" {...common} />
        <path d="M21 20.5 L33 20.5 M21 27.5 L33 27.5" {...common} strokeWidth={2.2} />
        <path d="M55 20.5 L67 20.5 M55 27.5 L67 27.5" {...common} strokeWidth={2.2} />
      </svg>
    )

  if (kind === 'cycle')
    return (
      <svg viewBox="0 0 64 64" aria-hidden>
        <path d="M50 20 A22 22 0 0 0 13 18" {...common} />
        <path d="M13 8 L13 18 L23 18" {...common} />
        <path d="M14 44 A22 22 0 0 0 51 46" {...common} />
        <path d="M51 56 L51 46 L41 46" {...common} />
        <path d="M27 32 C29 27 33 25 38 26 C36 30 32 33 27 32 Z" fill="currentColor" stroke="none" opacity="0.7" />
      </svg>
    )

  if (kind === 'waves')
    return (
      <svg viewBox="0 0 96 44" aria-hidden>
        <path d="M4 12 C14 4 24 20 34 12 C44 4 54 20 64 12 C74 4 84 16 92 10" {...common} />
        <path d="M4 24 C14 16 24 32 34 24 C44 16 54 32 64 24 C74 16 84 28 92 22" {...common} opacity="0.65" />
        <path d="M4 36 C14 28 24 44 34 36 C44 28 54 44 64 36 C74 28 84 40 92 34" {...common} opacity="0.35" />
      </svg>
    )

  if (kind === 'sprout')
    return (
      <svg viewBox="0 0 64 64" aria-hidden>
        <path d="M32 60 C32 46 32 38 32 30" {...common} />
        <path d="M32 36 C20 35 11 27 9 14 C22 16 31 24 32 36 Z" fill="currentColor" stroke="none" opacity="0.8" />
        <path d="M32 28 C33 18 40 10 51 8 C50 19 43 26 32 28 Z" fill="currentColor" stroke="none" opacity="0.55" />
        <path d="M20 60 Q32 56 44 60" {...common} opacity="0.6" />
      </svg>
    )

  // sun
  return (
    <svg viewBox="0 0 64 64" aria-hidden>
      <circle cx="32" cy="32" r="10.5" {...common} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4
        const x1 = 32 + Math.cos(a) * 16
        const y1 = 32 + Math.sin(a) * 16
        const x2 = 32 + Math.cos(a) * 23
        const y2 = 32 + Math.sin(a) * 23
        return <path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} {...common} />
      })}
    </svg>
  )
}

export default function Backdrop() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = ref.current
    if (!root) return
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('.bd-shape'))
    let centers: { x: number; y: number }[] = []
    const measure = () => {
      centers = nodes.map((n) => {
        const r = n.getBoundingClientRect()
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      })
    }
    measure()
    window.addEventListener('resize', measure)

    let raf = 0
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const mx = (e.clientX / window.innerWidth) * 2 - 1
        const my = (e.clientY / window.innerHeight) * 2 - 1
        nodes.forEach((n, i) => {
          const depth = Number(n.dataset.depth ?? 16)
          const c = centers[i]
          const d = Math.hypot(e.clientX - c.x, e.clientY - c.y)
          const f = Math.max(0, 1 - d / 300) ** 1.6 // proximity "wake"
          n.style.transform = `translate(${mx * depth}px, ${my * depth}px) scale(${1 + 0.24 * f})`
          n.style.opacity = String(0.08 + 0.12 * f)
        })
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('resize', measure)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="backdrop" ref={ref} aria-hidden>
      <div className="bd-blob" style={{ left: '-12vw', top: '-14vh', background: 'radial-gradient(circle, #237a5522, transparent 65%)' }} />
      <div className="bd-blob" style={{ right: '-10vw', top: '30vh', background: 'radial-gradient(circle, #2f6db41c, transparent 65%)', animationDelay: '-9s' }} />
      <div className="bd-blob" style={{ left: '24vw', bottom: '-18vh', background: 'radial-gradient(circle, #237a551c, transparent 65%)', animationDelay: '-15s' }} />
      {SHAPES.map((s, i) => (
        <div
          key={i}
          className="bd-shape"
          data-depth={s.depth}
          style={{ left: `${s.x}vw`, top: `${s.y}vh`, width: s.size, color: s.hue }}
        >
          <div className="bd-float" style={{ animationDuration: `${s.dur}s`, animationDelay: `${-i * 2.3}s` }}>
            <Icon kind={s.kind} flip={s.flip} />
          </div>
        </div>
      ))}
    </div>
  )
}
