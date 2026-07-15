import { useEffect, useRef } from 'react'
import SeaCanvas from './SeaCanvas'
import './SceneBackground.css'

// The whole Overview sits inside one seascape. Up top, an oil-import terminal
// at dawn works behind the headline (refinery, a tanker at the jetty, a
// loading arm, a lighthouse, gulls, a plane, drifting clouds). Below the
// waterline the sea fills the rest of the page, so scrolling down carries the
// reader beneath the surface while the swell rolls slowly downward. On load the
// scene expands out from the corner to fill the frame. Decorative, reduced-
// motion safe.
export default function SceneBackground() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const el = ref.current
    if (!el) return
    let raf = 0
    // the water below the surf shifts from blue to sea-green as you descend
    const TOP = [111, 154, 191]
    const DEEP = [86, 148, 116]
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const doc = document.documentElement.scrollHeight - window.innerHeight
        const d = Math.min(1, Math.max(0, window.scrollY / (doc || 1)))
        const c = TOP.map((a, i) => Math.round(a + (DEEP[i] - a) * d))
        el.style.setProperty('--sea-deep', `rgb(${c[0]},${c[1]},${c[2]})`)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="scene" ref={ref} aria-hidden>
      {/* the port at the surface */}
      <svg className="scene-art" viewBox="0 0 1200 620" preserveAspectRatio="xMidYMax slice">
        <defs>
          <radialGradient id="sc-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--sc-sun-1)" />
            <stop offset="55%" stopColor="var(--sc-sun-2)" />
            <stop offset="100%" stopColor="var(--sc-sun-2)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="sc-hull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2c3f52" />
            <stop offset="100%" stopColor="#1b2a39" />
          </linearGradient>
        </defs>

        {/* sun (small) */}
        <g className="sc-sun">
          <circle cx="1012" cy="118" r="72" fill="url(#sc-sun)" />
          <circle cx="1012" cy="118" r="26" fill="var(--sc-sun-1)" opacity="0.95" />
        </g>

        {/* clouds */}
        <g className="sc-cloud sc-cloud-a" fill="var(--sc-cloud)">
          <ellipse cx="0" cy="0" rx="52" ry="17" />
          <ellipse cx="38" cy="-12" rx="34" ry="15" />
          <ellipse cx="-32" cy="-6" rx="27" ry="12" />
        </g>
        <g className="sc-cloud sc-cloud-b" fill="var(--sc-cloud)">
          <ellipse cx="0" cy="0" rx="40" ry="14" />
          <ellipse cx="-28" cy="-9" rx="26" ry="11" />
        </g>

        {/* airliner with a contrail (scaled up so it reads clearly) */}
        <g className="sc-plane">
          <g transform="scale(2.6)">
            <line x1="-72" y1="0" x2="-6" y2="0" stroke="var(--sc-cloud)" strokeWidth="2.6" strokeLinecap="round" opacity="0.75" />
            <g fill="var(--sc-plane)">
              <path d="M0 0 L26 -1.6 L35 0 L26 1.6 Z" />
              <path d="M12 0 L1 -11 L7 -11 L21 -1 Z" />
              <path d="M12 0 L1 11 L7 11 L21 1 Z" />
              <path d="M27 -1 L22 -8 L25 -8 L32 -1 Z" />
              <path d="M27 1 L22 8 L25 8 L32 1 Z" />
            </g>
          </g>
        </g>

        {/* gulls */}
        <g className="sc-gulls" stroke="var(--sc-gull)" strokeWidth="2.6" fill="none" strokeLinecap="round">
          <path className="sc-gull" d="M0 0 Q6 -7 12 0 Q18 -7 24 0" transform="translate(690 150)" />
          <path className="sc-gull" d="M0 0 Q5 -6 10 0 Q15 -6 20 0" transform="translate(748 176)" />
          <path className="sc-gull" d="M0 0 Q5 -6 10 0 Q15 -6 20 0" transform="translate(660 196)" />
        </g>

        {/* right headland + lighthouse */}
        <g className="sc-head">
          <path d="M1092 452 C1104 418 1150 414 1200 424 L1200 470 L1080 470 Z" fill="var(--sc-land)" />
          <g transform="translate(1140 360)">
            <path d="M-10 92 L-6 8 L6 8 L10 92 Z" fill="#e9edf1" />
            <path d="M-8.4 70 L8.4 70 L9 84 L-9 84 Z" fill="#c94f3a" />
            <path d="M-7.6 46 L7.6 46 L8 58 L-8 58 Z" fill="#c94f3a" />
            <rect x="-9" y="0" width="18" height="10" rx="1.5" fill="#37485a" />
            <rect x="-6" y="1.5" width="12" height="7" rx="1" fill="var(--sc-lamp)" className="sc-lamp" />
            <path className="sc-beam" d="M0 5 L-150 -28 L-150 44 Z" fill="var(--sc-lamp)" opacity="0.16" />
          </g>
        </g>

        {/* refinery / tank farm on the left shore */}
        <g className="sc-port">
          <rect x="-20" y="430" width="380" height="200" fill="var(--sc-land)" />
          <path d="M40 414 L330 414 M40 421 L330 421" stroke="var(--sc-port-c)" strokeWidth="3.5" />
          {[58, 118, 178, 238, 298].map((px) => (
            <rect key={px} x={px} y="414" width="5" height="18" fill="var(--sc-port-c)" />
          ))}
          <rect x="34" y="390" width="60" height="42" rx="5" fill="var(--sc-tank)" />
          <ellipse cx="64" cy="390" rx="30" ry="8" fill="var(--sc-tank-top)" />
          <rect x="110" y="376" width="72" height="56" rx="5" fill="var(--sc-tank)" />
          <ellipse cx="146" cy="376" rx="36" ry="9" fill="var(--sc-tank-top)" />
          <rect x="206" y="330" width="26" height="102" fill="var(--sc-port-c)" />
          {[342, 362, 382, 402].map((py) => (
            <rect key={py} x="200" y={py} width="38" height="5" rx="1.5" fill="var(--sc-tank-top)" />
          ))}
          <rect x="266" y="342" width="10" height="90" fill="var(--sc-port-c)" />
          <path className="sc-flare" d="M271 330 C263 340 265 350 271 355 C277 350 279 340 271 330 Z" fill="var(--sc-flare)" />
          <path d="M308 430 L308 360 L392 360 M322 360 L322 430 M378 360 L378 430 M392 360 L412 376" stroke="var(--sc-port-c)" strokeWidth="5" fill="none" />
        </g>

        {/* jetty */}
        <g className="sc-jetty">
          <rect x="300" y="472" width="220" height="12" fill="#5c6b78" />
          {[322, 366, 410, 454, 498].map((px) => (
            <rect key={px} x={px} y="484" width="8" height="40" fill="#47555f" />
          ))}
        </g>

        {/* the tanker, anchored offshore to the right and clear of the copy */}
        <g transform="translate(196 6)">
          <g className="sc-ship">
            <path d="M470 500 L806 500 L784 546 C784 546 620 558 470 546 Z" fill="url(#sc-hull)" />
            <rect x="470" y="500" width="336" height="9" fill="#b3441f" />
            <rect x="500" y="482" width="242" height="18" rx="3" fill="#3a4d61" />
            {[522, 570, 618, 666, 714].map((px) => (
              <rect key={px} x={px} y="466" width="7" height="18" fill="#43586d" />
            ))}
            <rect x="742" y="454" width="60" height="46" rx="3" fill="#e9edf1" />
            <rect x="742" y="454" width="60" height="11" rx="3" fill="#cfd8e0" />
            <g fill="#2f6db4">
              <rect x="750" y="470" width="10" height="8" rx="1" />
              <rect x="766" y="470" width="10" height="8" rx="1" />
              <rect x="782" y="470" width="10" height="8" rx="1" />
              <rect x="750" y="484" width="10" height="8" rx="1" />
              <rect x="766" y="484" width="10" height="8" rx="1" />
              <rect x="782" y="484" width="10" height="8" rx="1" />
            </g>
            <rect x="804" y="458" width="18" height="30" rx="2" fill="#2c3f52" />
            <rect x="804" y="458" width="18" height="9" fill="#237a55" />
            <path className="sc-plume" d="M813 452 C804 438 824 428 814 414 C807 405 819 397 814 388" stroke="var(--sc-plume)" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.32" />
          </g>
        </g>

        {/* buoys, bobbing in place */}
        <g transform="translate(360 560)">
          <g className="sc-buoy">
            <path d="M0 0 L5 -14 L-5 -14 Z" fill="#c94f3a" />
            <rect x="-6" y="0" width="12" height="9" rx="2" fill="#c94f3a" />
          </g>
        </g>
        <g transform="translate(1030 548)">
          <g className="sc-buoy sc-buoy-late">
            <path d="M0 0 L4 -11 L-4 -11 Z" fill="#2e7d52" />
            <rect x="-5" y="0" width="10" height="7" rx="2" fill="#2e7d52" />
          </g>
        </g>
      </svg>

      {/* animated surf fills the water */}
      <SeaCanvas />

      {/* underwater life: light rays and bubbles rising through the depths */}
      <div className="scene-life">
        <span className="scene-ray scene-ray-1" />
        <span className="scene-ray scene-ray-2" />
        <span className="scene-ray scene-ray-3" />
        {BUBBLES.map((b, i) => (
          <span
            key={i}
            className="scene-bubble"
            style={{
              left: `${b.x}%`,
              width: `${b.s}px`,
              height: `${b.s}px`,
              animationDuration: `${b.d}s`,
              animationDelay: `${b.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// deterministic bubble field so it doesn't reshuffle each render
const BUBBLES = Array.from({ length: 22 }, (_, i) => ({
  x: (i * 37) % 100,
  s: 4 + ((i * 13) % 12),
  d: 9 + ((i * 7) % 10),
  delay: -((i * 11) % 14),
}))
