import { useEffect, useRef } from 'react'
import './TideFlow.css'

// A body of water that runs down the page behind the lower sections: rows of
// gentle wave lines drift steadily downward, so as the reader scrolls past the
// chain and on, the surf keeps washing down with them. Fades in once the hero
// is behind you. Fixed, decorative, reduced-motion safe.
export default function TideFlow() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const vh = window.innerHeight
        const y = window.scrollY
        // invisible over the hero, easing in as the chain arrives
        const op = Math.max(0, Math.min(0.55, (y - vh * 0.5) / (vh * 0.8) * 0.55))
        el.style.setProperty('--tide-op', String(op))
        // a little extra downward push tied to scroll position
        el.style.setProperty('--tide-shift', `${(y * 0.04) % 150}px`)
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
    <div className="tideflow" ref={ref} aria-hidden>
      <svg className="tideflow-svg" viewBox="0 0 1200 600" preserveAspectRatio="none">
        <defs>
          <pattern id="tf-wave" x="0" y="0" width="1200" height="150" patternUnits="userSpaceOnUse">
            <path
              d="M-100 44 C110 20 260 64 450 44 C640 24 790 64 980 44 C1170 24 1320 64 1500 44"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              opacity="0.55"
            />
            <path
              d="M-100 100 C110 76 260 120 450 100 C640 80 790 120 980 100 C1170 80 1320 120 1500 100"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              opacity="0.32"
            />
          </pattern>
        </defs>
        <g className="tideflow-g">
          <rect x="0" y="-150" width="1200" height="900" fill="url(#tf-wave)" />
        </g>
      </svg>
    </div>
  )
}
