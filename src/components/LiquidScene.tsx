import './LiquidScene.css'

// Live-action hero backdrop: a body of liquid flows across the frame, its
// surface rippling, and droplets detach from the crests and fall — while
// leaves drift down through the air. Organic silhouettes (teardrops, veined
// leaves), not geometric primitives. Purely decorative, reduced-motion safe.

const LEAF =
  'M2 30 C10 18 24 8 46 2 C40 22 26 34 4 34 C3 33 2 31 2 30 Z'
const DROP = 'M6 0 C9 8 12 12 12 17 A6 6 0 0 1 0 17 C0 12 3 8 6 0 Z'

export default function LiquidScene() {
  return (
    <div className="ls" aria-hidden>
      {/* drifting leaves */}
      <div className="ls-air">
        {[
          { x: 12, d: 0, dur: 15, s: 0.7, h: '#2e7d52' },
          { x: 34, d: -6, dur: 19, s: 1, h: '#237a55' },
          { x: 63, d: -3, dur: 17, s: 0.85, h: '#3a8f63' },
          { x: 82, d: -11, dur: 21, s: 1.1, h: '#2e7d52' },
        ].map((l, i) => (
          <span
            key={i}
            className="ls-leaf"
            style={{
              left: `${l.x}%`,
              color: l.h,
              animationDuration: `${l.dur}s`,
              animationDelay: `${l.d}s`,
              ['--s' as string]: l.s,
            }}
          >
            <svg viewBox="0 0 48 36"><path d={LEAF} fill="currentColor" /></svg>
          </span>
        ))}
      </div>

      {/* falling droplets that detach from the liquid crest */}
      <div className="ls-drops">
        {[8, 26, 41, 57, 73, 90].map((x, i) => (
          <span
            key={i}
            className="ls-drop"
            style={{ left: `${x}%`, animationDelay: `${i * 1.3 + 0.4}s`, animationDuration: `${3.2 + (i % 3) * 0.7}s` }}
          >
            <svg viewBox="0 0 12 24"><path d={DROP} fill="currentColor" /></svg>
          </span>
        ))}
      </div>

      {/* the flowing liquid surface */}
      <svg className="ls-liquid" viewBox="0 0 1200 240" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ls-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ls-a)" />
            <stop offset="100%" stopColor="var(--ls-b)" />
          </linearGradient>
        </defs>
        <g className="ls-wave ls-wave-back">
          <path
            fill="url(#ls-fill)"
            opacity="0.5"
            d="M0 120 C150 90 300 150 450 120 C600 90 750 150 900 120 C1050 90 1200 150 1350 120 L2400 120 L2400 240 L0 240 Z"
          />
        </g>
        <g className="ls-wave ls-wave-front">
          <path
            fill="url(#ls-fill)"
            d="M0 150 C150 120 300 180 450 150 C600 120 750 180 900 150 C1050 120 1200 180 1350 150 L2400 150 L2400 240 L0 240 Z"
          />
        </g>
      </svg>
    </div>
  )
}
