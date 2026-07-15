import { useEffect, useRef } from 'react'
import './HeroArt.css'

// Hero illustration: an oil importer's seascape — a crude tanker riding the
// swell off a refinery port at dawn, the tide washing in and drawing back like
// real surf. A drawn scene (gradients, reflections, layered surf), not abstract
// shapes. Gentle pointer parallax; reduced-motion safe.
export default function HeroArt() {
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
        el.style.setProperty('--mx', String(Math.max(-1, Math.min(1, mx))))
        el.style.setProperty('--my', String(Math.max(-1, Math.min(1, my))))
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="ha" ref={ref} aria-hidden>
      <svg viewBox="0 0 620 520" className="ha-svg" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="ha-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ha-sky-1)" />
            <stop offset="60%" stopColor="var(--ha-sky-2)" />
            <stop offset="100%" stopColor="var(--ha-sky-3)" />
          </linearGradient>
          <radialGradient id="ha-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--ha-sun-1)" />
            <stop offset="55%" stopColor="var(--ha-sun-2)" />
            <stop offset="100%" stopColor="var(--ha-sun-2)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ha-sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ha-sea-1)" />
            <stop offset="100%" stopColor="var(--ha-sea-2)" />
          </linearGradient>
          <linearGradient id="ha-hull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c3f52" />
            <stop offset="100%" stopColor="#1b2a39" />
          </linearGradient>
          <clipPath id="ha-frame"><rect x="0" y="0" width="620" height="520" rx="20" /></clipPath>
        </defs>

        <g clipPath="url(#ha-frame)">
          {/* sky + sun */}
          <rect x="0" y="0" width="620" height="360" fill="url(#ha-sky)" />
          <g className="ha-sun">
            <circle cx="452" cy="150" r="120" fill="url(#ha-sun)" />
            <circle cx="452" cy="150" r="46" fill="var(--ha-sun-1)" opacity="0.92" />
          </g>

          {/* distant refinery port on the horizon */}
          <g className="ha-port" opacity="0.55">
            {/* storage tanks */}
            <rect x="60" y="300" width="42" height="34" rx="3" fill="var(--ha-port-c)" />
            <rect x="106" y="292" width="52" height="42" rx="3" fill="var(--ha-port-c)" />
            <rect x="164" y="304" width="34" height="30" rx="3" fill="var(--ha-port-c)" />
            {/* distillation tower */}
            <rect x="212" y="262" width="16" height="72" fill="var(--ha-port-c)" />
            <rect x="207" y="262" width="26" height="7" rx="2" fill="var(--ha-port-c)" />
            {/* flare stack with a small flame */}
            <rect x="250" y="276" width="7" height="58" fill="var(--ha-port-c)" />
            <path className="ha-flare" d="M253.5 268 C249 274 250 280 253.5 283 C257 280 258 274 253.5 268 Z" fill="var(--ha-flare)" />
            {/* gantry crane */}
            <path d="M300 334 L300 286 L356 286 M312 286 L312 334 M344 286 L344 334 M356 286 L368 296" stroke="var(--ha-port-c)" strokeWidth="4" fill="none" />
          </g>

          {/* sea */}
          <rect x="0" y="334" width="620" height="186" fill="url(#ha-sea)" />

          {/* sun reflection on the water */}
          <g className="ha-reflect" opacity="0.5">
            <rect x="430" y="342" width="44" height="4" rx="2" fill="var(--ha-sun-1)" />
            <rect x="424" y="356" width="56" height="4" rx="2" fill="var(--ha-sun-1)" opacity="0.7" />
            <rect x="432" y="370" width="40" height="4" rx="2" fill="var(--ha-sun-1)" opacity="0.5" />
          </g>

          {/* the crude tanker */}
          <g className="ha-ship">
            {/* hull */}
            <path d="M150 372 L470 372 L452 410 C452 410 300 420 150 410 Z" fill="url(#ha-hull)" />
            <rect x="150" y="372" width="320" height="7" fill="#b3441f" />
            {/* deck pipework */}
            <rect x="176" y="356" width="230" height="16" rx="3" fill="#3a4d61" />
            <rect x="188" y="360" width="206" height="3" fill="#5b7085" />
            {/* manifold kingposts */}
            <rect x="214" y="342" width="6" height="18" fill="#43586d" />
            <rect x="262" y="342" width="6" height="18" fill="#43586d" />
            <rect x="310" y="342" width="6" height="18" fill="#43586d" />
            <rect x="358" y="342" width="6" height="18" fill="#43586d" />
            {/* stern deckhouse */}
            <rect x="404" y="330" width="52" height="42" rx="3" fill="#e9edf1" />
            <rect x="404" y="330" width="52" height="10" rx="3" fill="#cfd8e0" />
            <g fill="#2f6db4">
              <rect x="411" y="345" width="9" height="7" rx="1" />
              <rect x="424" y="345" width="9" height="7" rx="1" />
              <rect x="437" y="345" width="9" height="7" rx="1" />
              <rect x="411" y="357" width="9" height="7" rx="1" />
              <rect x="424" y="357" width="9" height="7" rx="1" />
              <rect x="437" y="357" width="9" height="7" rx="1" />
            </g>
            {/* funnel with a soft plume */}
            <rect x="458" y="336" width="16" height="24" rx="2" fill="#2c3f52" />
            <rect x="458" y="336" width="16" height="7" fill="#237a55" />
            <path className="ha-plume" d="M466 332 C458 320 474 312 466 300 C460 292 470 286 466 278" stroke="var(--ha-plume)" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.35" />
          </g>

          {/* layered surf that washes in and draws back */}
          <g className="ha-surf ha-surf-3">
            <path d="M-80 430 C60 414 160 446 320 430 C470 415 560 446 700 430 L700 520 L-80 520 Z" fill="var(--ha-surf-a)" />
          </g>
          <g className="ha-surf ha-surf-2">
            <path d="M-80 456 C80 438 180 470 340 454 C500 438 590 470 700 456 L700 520 L-80 520 Z" fill="var(--ha-surf-b)" />
          </g>
          <g className="ha-surf ha-surf-1">
            <path d="M-80 484 C90 466 200 496 360 482 C520 468 600 496 700 484 L700 520 L-80 520 Z" fill="var(--ha-surf-c)" />
            {/* foam line */}
            <path d="M-80 484 C90 466 200 496 360 482 C520 468 600 496 700 484" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.5" />
          </g>
        </g>
      </svg>
    </div>
  )
}
