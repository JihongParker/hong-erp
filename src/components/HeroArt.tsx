import { useEffect, useRef } from 'react'
import './HeroArt.css'

// Hero illustration: a working oil-import terminal at dawn, alive like a short
// loop of film. A crude tanker berthed at the jetty is loaded through a marine
// loading arm; behind it a refinery breathes (distillation tower, tank farm,
// flare, pipe rack); a lighthouse sweeps the headland; gulls cross the sky;
// clouds drift; buoys bob and the surf washes in and draws back. Gentle pointer
// parallax on top. Purely decorative, reduced-motion safe.
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
            <stop offset="55%" stopColor="var(--ha-sky-2)" />
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
            <circle cx="506" cy="104" r="116" fill="url(#ha-sun)" />
            <circle cx="506" cy="104" r="42" fill="var(--ha-sun-1)" opacity="0.92" />
          </g>

          {/* drifting clouds */}
          <g className="ha-cloud ha-cloud-a" fill="var(--ha-cloud)">
            <ellipse cx="0" cy="0" rx="48" ry="16" />
            <ellipse cx="34" cy="-11" rx="32" ry="14" />
            <ellipse cx="-30" cy="-6" rx="26" ry="11" />
          </g>
          <g className="ha-cloud ha-cloud-b" fill="var(--ha-cloud)">
            <ellipse cx="0" cy="0" rx="38" ry="13" />
            <ellipse cx="-26" cy="-8" rx="24" ry="10" />
          </g>

          {/* gulls */}
          <g className="ha-gulls" stroke="var(--ha-gull)" strokeWidth="2.4" fill="none" strokeLinecap="round">
            <path className="ha-gull" d="M0 0 Q6 -7 12 0 Q18 -7 24 0" transform="translate(150 92)" />
            <path className="ha-gull" d="M0 0 Q5 -6 10 0 Q15 -6 20 0" transform="translate(210 120)" />
            <path className="ha-gull" d="M0 0 Q5 -6 10 0 Q15 -6 20 0" transform="translate(120 140)" />
          </g>

          {/* right headland + lighthouse */}
          <g className="ha-head">
            <path d="M556 330 C566 300 604 296 640 306 L640 360 L540 360 Z" fill="var(--ha-land)" />
            {/* lighthouse */}
            <g transform="translate(590 250)">
              <path d="M-9 78 L-6 8 L6 8 L9 78 Z" fill="#e9edf1" />
              <path d="M-7.6 60 L7.6 60 L8 72 L-8 72 Z" fill="#c94f3a" />
              <path d="M-7 40 L7 40 L7.4 52 L-7.4 52 Z" fill="#c94f3a" />
              <rect x="-8" y="0" width="16" height="9" rx="1.5" fill="#37485a" />
              <rect x="-5.5" y="1.5" width="11" height="6" rx="1" fill="var(--ha-lamp)" className="ha-lamp" />
              <path className="ha-beam" d="M0 4 L120 -30 L120 40 Z" fill="var(--ha-lamp)" opacity="0.18" />
            </g>
          </g>

          {/* refinery / tank farm on the left shore */}
          <g className="ha-port">
            <rect x="-20" y="330" width="290" height="190" fill="var(--ha-land)" />
            {/* pipe rack */}
            <path d="M30 316 L250 316 M30 322 L250 322" stroke="var(--ha-port-c)" strokeWidth="3" />
            {[46, 90, 134, 178, 222].map((px) => (
              <rect key={px} x={px} y="316" width="4" height="16" fill="var(--ha-port-c)" />
            ))}
            {/* storage tanks */}
            <rect x="26" y="296" width="46" height="36" rx="4" fill="var(--ha-tank)" />
            <ellipse cx="49" cy="296" rx="23" ry="6" fill="var(--ha-tank-top)" />
            <rect x="84" y="286" width="56" height="46" rx="4" fill="var(--ha-tank)" />
            <ellipse cx="112" cy="286" rx="28" ry="7" fill="var(--ha-tank-top)" />
            {/* distillation tower */}
            <rect x="158" y="252" width="20" height="80" fill="var(--ha-port-c)" />
            {[262, 278, 294, 310].map((py) => (
              <rect key={py} x="154" y={py} width="28" height="4" rx="1" fill="var(--ha-tank-top)" />
            ))}
            {/* flare stack + flame */}
            <rect x="204" y="262" width="8" height="70" fill="var(--ha-port-c)" />
            <path className="ha-flare" d="M208 254 C202 261 203 268 208 272 C213 268 214 261 208 254 Z" fill="var(--ha-flare)" />
            {/* gantry crane on the jetty */}
            <path d="M236 330 L236 276 L300 276 M248 276 L248 330 M288 276 L288 330 M300 276 L316 288" stroke="var(--ha-port-c)" strokeWidth="4" fill="none" />
          </g>

          {/* jetty deck on pilings reaching to the ship */}
          <g className="ha-jetty">
            <rect x="150" y="360" width="150" height="9" fill="#5c6b78" />
            {[168, 200, 232, 264, 292].map((px) => (
              <rect key={px} x={px} y="369" width="6" height="30" fill="#47555f" />
            ))}
          </g>

          {/* sea */}
          <rect x="0" y="358" width="620" height="162" fill="url(#ha-sea)" />

          {/* sun reflection */}
          <g className="ha-reflect">
            <rect x="484" y="366" width="44" height="4" rx="2" fill="var(--ha-sun-1)" />
            <rect x="478" y="380" width="56" height="4" rx="2" fill="var(--ha-sun-1)" opacity="0.7" />
            <rect x="486" y="394" width="40" height="4" rx="2" fill="var(--ha-sun-1)" opacity="0.5" />
          </g>

          {/* the crude tanker berthed at the jetty */}
          <g className="ha-ship">
            <path d="M256 386 L512 386 L496 420 C496 420 372 430 256 421 Z" fill="url(#ha-hull)" />
            <rect x="256" y="386" width="256" height="7" fill="#b3441f" />
            <rect x="280" y="372" width="184" height="14" rx="3" fill="#3a4d61" />
            {[300, 336, 372, 408, 444].map((px) => (
              <rect key={px} x={px} y="360" width="6" height="16" fill="#43586d" />
            ))}
            {/* stern deckhouse */}
            <rect x="460" y="348" width="46" height="38" rx="3" fill="#e9edf1" />
            <rect x="460" y="348" width="46" height="9" rx="3" fill="#cfd8e0" />
            <g fill="#2f6db4">
              <rect x="466" y="361" width="8" height="6" rx="1" />
              <rect x="478" y="361" width="8" height="6" rx="1" />
              <rect x="490" y="361" width="8" height="6" rx="1" />
              <rect x="466" y="372" width="8" height="6" rx="1" />
              <rect x="478" y="372" width="8" height="6" rx="1" />
              <rect x="490" y="372" width="8" height="6" rx="1" />
            </g>
            <rect x="508" y="352" width="15" height="24" rx="2" fill="#2c3f52" />
            <rect x="508" y="352" width="15" height="7" fill="#237a55" />
            <path className="ha-plume" d="M515.5 348 C508 336 524 328 516 316 C510 308 520 302 516 294" stroke="var(--ha-plume)" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.35" />
          </g>

          {/* marine loading arm from the jetty to the ship's manifold */}
          <g className="ha-arm" stroke="#8a5a2b" strokeWidth="5" fill="none" strokeLinecap="round">
            <path d="M300 360 L332 338" />
            <path className="ha-arm-swing" d="M332 338 L372 372" />
            <circle cx="300" cy="360" r="4" fill="#8a5a2b" stroke="none" />
            <circle cx="332" cy="338" r="4" fill="#8a5a2b" stroke="none" />
          </g>

          {/* buoys */}
          <g className="ha-buoy ha-buoy-a">
            <path d="M0 0 L4 -12 L-4 -12 Z" fill="#c94f3a" />
            <rect x="-5" y="0" width="10" height="7" rx="2" fill="#c94f3a" />
          </g>
          <g className="ha-buoy ha-buoy-b">
            <path d="M0 0 L3.5 -10 L-3.5 -10 Z" fill="#2e7d52" />
            <rect x="-4.5" y="0" width="9" height="6" rx="2" fill="#2e7d52" />
          </g>

          {/* layered surf washing in and drawing back */}
          <g className="ha-surf ha-surf-3">
            <path d="M-80 452 C60 436 160 468 320 452 C470 437 560 468 700 452 L700 520 L-80 520 Z" fill="var(--ha-surf-a)" />
          </g>
          <g className="ha-surf ha-surf-2">
            <path d="M-80 476 C80 458 180 490 340 474 C500 458 590 490 700 476 L700 520 L-80 520 Z" fill="var(--ha-surf-b)" />
          </g>
          <g className="ha-surf ha-surf-1">
            <path d="M-80 498 C90 480 200 510 360 496 C520 482 600 510 700 498 L700 520 L-80 520 Z" fill="var(--ha-surf-c)" />
            <path d="M-80 498 C90 480 200 510 360 496 C520 482 600 510 700 498" stroke="#ffffff" strokeWidth="2.5" fill="none" opacity="0.5" />
          </g>
        </g>
      </svg>
    </div>
  )
}
