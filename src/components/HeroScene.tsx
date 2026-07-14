import { useEffect, useRef } from 'react'
import './HeroScene.css'

// The Overview hero stage — one composed scene instead of scattered clip art.
// Story: the pump jack (the importer's oil present) sits on the far hill while
// wind turbines turn on the near ones; CO₂ bubbles drift up from the pump and
// dissolve; the sun breathes; clouds and waves keep the frame alive. Mouse
// moves the layers with gentle depth. Decorative, reduced-motion safe.

export default function HeroScene() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return
    let raf = 0
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const mx = ((e.clientX - r.left) / r.width - 0.5) * 2
        const my = ((e.clientY - r.top) / r.height - 0.5) * 2
        el.style.setProperty('--px', String(Math.max(-1.4, Math.min(1.4, mx))))
        el.style.setProperty('--py', String(Math.max(-1.4, Math.min(1.4, my))))
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="hs" ref={ref} aria-hidden>
      <svg viewBox="0 0 560 620" className="hs-svg">
        <defs>
          <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--hs-sky-a)" />
            <stop offset="100%" stopColor="var(--hs-sky-b)" />
          </linearGradient>
          <linearGradient id="hs-hill1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--hs-hill1-a)" />
            <stop offset="100%" stopColor="var(--hs-hill1-b)" />
          </linearGradient>
          <linearGradient id="hs-hill2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--hs-hill2-a)" />
            <stop offset="100%" stopColor="var(--hs-hill2-b)" />
          </linearGradient>
          <clipPath id="hs-clip">
            <rect x="0" y="0" width="560" height="620" rx="28" />
          </clipPath>
        </defs>

        <g clipPath="url(#hs-clip)">
        <rect x="0" y="0" width="560" height="620" rx="28" fill="url(#hs-sky)" />

        {/* sun */}
        <g className="hs-sun hs-l1">
          <circle cx="118" cy="118" r="34" fill="var(--hs-sun)" opacity="0.9" />
          <g stroke="var(--hs-sun)" strokeWidth="5" strokeLinecap="round" opacity="0.7">
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i * Math.PI) / 4
              return (
                <line
                  key={i}
                  x1={118 + Math.cos(a) * 48}
                  y1={118 + Math.sin(a) * 48}
                  x2={118 + Math.cos(a) * 62}
                  y2={118 + Math.sin(a) * 62}
                />
              )
            })}
          </g>
        </g>

        {/* clouds */}
        <g className="hs-cloud hs-cloud1" fill="var(--hs-cloud)">
          <ellipse cx="0" cy="0" rx="46" ry="16" />
          <ellipse cx="34" cy="-10" rx="30" ry="13" />
        </g>
        <g className="hs-cloud hs-cloud2" fill="var(--hs-cloud)">
          <ellipse cx="0" cy="0" rx="36" ry="13" />
          <ellipse cx="-28" cy="-8" rx="24" ry="10" />
        </g>

        {/* CO2 bubbles rising from the pump and dissolving */}
        {[0, 1, 2].map((i) => (
          <g key={i} className={`hs-co2 hs-co2-${i}`} stroke="var(--hs-line)" strokeWidth="2.4" fill="none">
            <circle cx="452" cy="380" r="9" />
            <circle cx="437" cy="380" r="5.5" />
            <circle cx="467" cy="380" r="5.5" />
          </g>
        ))}

        {/* far hill with pump jack (oil heritage) */}
        <g className="hs-l2">
          <path d="M0 430 C120 360 260 380 380 400 C460 412 520 400 560 386 L560 620 L0 620 Z" fill="url(#hs-hill2)" />
          <g stroke="var(--hs-ink)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.75">
            <path d="M420 402 L436 372 L452 402" />
            <path d="M427 390 L445 390" />
            <path d="M408 370 L466 376" strokeWidth="5.5" />
            <circle cx="407" cy="369" r="6" />
            <path d="M466 372 L473 375 L466 381 Z" fill="var(--hs-ink)" stroke="none" />
            <path d="M470 381 L470 396" />
            <path d="M412 402 L462 402" opacity="0.7" />
          </g>
        </g>

        {/* near hills */}
        <g className="hs-l3">
          <path d="M0 470 C90 430 200 444 300 466 C400 488 500 470 560 452 L560 620 L0 620 Z" fill="url(#hs-hill1)" />
        </g>

        {/* turbines on the near hills */}
        <g className="hs-l3">
          {[
            { x: 150, y: 470, s: 1.15 },
            { x: 300, y: 492, s: 0.85 },
          ].map((t, i) => (
            <g key={i} transform={`translate(${t.x} ${t.y}) scale(${t.s})`}>
              <path d="M-4 0 L4 0 L2.4 -96 L-2.4 -96 Z" fill="var(--hs-ink)" opacity="0.85" />
              <g className="hs-rotor" style={{ animationDelay: `${-i * 3.1}s` }}>
                <g fill="var(--hs-ink)">
                  <path d="M0 -94 C-3.6 -106 -3.6 -122 0 -132 C3.6 -122 3.6 -106 0 -94 Z" />
                  <path d="M0 -94 C-3.6 -106 -3.6 -122 0 -132 C3.6 -122 3.6 -106 0 -94 Z" transform="rotate(120 0 -96)" />
                  <path d="M0 -94 C-3.6 -106 -3.6 -122 0 -132 C3.6 -122 3.6 -106 0 -94 Z" transform="rotate(240 0 -96)" />
                </g>
              </g>
              <circle cx="0" cy="-96" r="5.4" fill="var(--hs-ink)" />
            </g>
          ))}
        </g>

        {/* sprout + leaves foreground */}
        <g className="hs-l4">
          <g transform="translate(78 540)">
            <path d="M0 34 C0 20 0 12 0 4" stroke="var(--hs-leaf)" strokeWidth="5" strokeLinecap="round" fill="none" />
            <path d="M0 12 C-12 11 -21 3 -23 -9 C-10 -7 -1 1 0 12 Z" fill="var(--hs-leaf)" />
            <path d="M0 5 C1 -5 8 -13 19 -15 C18 -4 11 3 0 5 Z" fill="var(--hs-leaf)" opacity="0.75" />
          </g>
          <g className="hs-waves" stroke="var(--hs-wave)" strokeWidth="4" strokeLinecap="round" fill="none">
            <path d="M330 560 C345 552 360 568 375 560 C390 552 405 568 420 560 C433 553 446 556 454 558" />
            <path d="M350 580 C365 572 380 588 395 580 C410 572 425 588 440 580" opacity="0.6" />
          </g>
        </g>
        </g>
      </svg>
    </div>
  )
}
