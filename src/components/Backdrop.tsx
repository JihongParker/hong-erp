import { useEffect, useRef } from 'react'
import './Backdrop.css'

// Ambient industry backdrop — oil droplets, benzene hexagons, steel I-beams
// drifting behind the content at whisper opacity, with a light mouse parallax.
// Decorative only: fixed, pointer-events none, hidden from the a11y tree,
// stilled under prefers-reduced-motion.

const SHAPES: {
  kind: 'drop' | 'hex' | 'beam'
  x: number // vw
  y: number // vh
  size: number
  depth: number // parallax factor
  dur: number // float duration s
  hue: string
}[] = [
  { kind: 'drop', x: 8, y: 18, size: 90, depth: 14, dur: 19, hue: '#237a55' },
  { kind: 'hex', x: 82, y: 12, size: 120, depth: 22, dur: 24, hue: '#2f6db4' },
  { kind: 'beam', x: 68, y: 74, size: 100, depth: 10, dur: 21, hue: '#b3610f' },
  { kind: 'drop', x: 88, y: 52, size: 60, depth: 30, dur: 16, hue: '#2f6db4' },
  { kind: 'hex', x: 22, y: 78, size: 84, depth: 18, dur: 26, hue: '#237a55' },
  { kind: 'beam', x: 42, y: 8, size: 66, depth: 26, dur: 18, hue: '#237a55' },
  { kind: 'hex', x: 55, y: 44, size: 56, depth: 34, dur: 22, hue: '#b3610f' },
  { kind: 'drop', x: 33, y: 46, size: 46, depth: 24, dur: 17, hue: '#237a55' },
  { kind: 'beam', x: 12, y: 55, size: 54, depth: 20, dur: 23, hue: '#2f6db4' },
]

function Shape({ kind }: { kind: 'drop' | 'hex' | 'beam' }) {
  if (kind === 'drop')
    return (
      <svg viewBox="0 0 40 52" aria-hidden>
        <path
          d="M20 2 C20 2 4 24 4 35 a16 16 0 0 0 32 0 C36 24 20 2 20 2 Z"
          fill="currentColor"
          opacity="0.5"
        />
        <path d="M13 36 a7 8 0 0 0 7 8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    )
  if (kind === 'hex')
    return (
      <svg viewBox="0 0 44 50" aria-hidden>
        <polygon
          points="22,2 41,13 41,37 22,48 3,37 3,13"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <circle cx="22" cy="25" r="6" fill="currentColor" opacity="0.55" />
      </svg>
    )
  return (
    <svg viewBox="0 0 48 48" aria-hidden>
      <path
        d="M8 6 h32 v8 h-11 v20 h11 v8 H8 v-8 h11 V14 H8 Z"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  )
}

export default function Backdrop() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const mx = (e.clientX / window.innerWidth) * 2 - 1
        const my = (e.clientY / window.innerHeight) * 2 - 1
        ref.current?.style.setProperty('--mx', String(mx))
        ref.current?.style.setProperty('--my', String(my))
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="backdrop" ref={ref} aria-hidden>
      {SHAPES.map((s, i) => (
        <div
          key={i}
          className={`bd-shape bd-${s.kind}`}
          style={{
            left: `${s.x}vw`,
            top: `${s.y}vh`,
            width: s.size,
            color: s.hue,
            animationDuration: `${s.dur}s`,
            animationDelay: `${-i * 2.7}s`,
            transform: `translate(calc(var(--mx, 0) * ${s.depth}px), calc(var(--my, 0) * ${s.depth}px))`,
          }}
        >
          <Shape kind={s.kind} />
        </div>
      ))}
    </div>
  )
}
