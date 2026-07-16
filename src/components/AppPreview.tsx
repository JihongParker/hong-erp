import { useEffect, useRef, useState, type ReactElement } from 'react'
import './AppPreview.css'

// Hero stage: a live photocard stack. Each card is a miniature of one module,
// its picture continuously morphing under an internal "dial" (a looping value
// that plays the module's key motion like a gif). Left/right arrows flip cards;
// with no interaction it auto-advances every 5s. The stack tilts in perspective
// and drifts on scroll (parallax). Decorative — the real screens are one click
// away — and reduced-motion safe.

const C_FIN = '#2f6db4'
const C_CLI = '#2e7d52'
const C_ACC = '#237a55'
const C_AMBER = '#b3610f'

const W = 320
const H = 150

type Card = {
  url: string
  chartTitle: string
  tiles: (d: number) => { l: string; v: string; c?: string }[]
  draw: (d: number) => ReactElement
}

const line = (f: (t: number) => number, X: (t: number) => number, Y: (v: number) => number) =>
  Array.from({ length: 41 }, (_, i) => {
    const t = i / 40
    return `${i ? 'L' : 'M'}${X(t).toFixed(1)},${Y(f(t)).toFixed(1)}`
  }).join('')

// ── card 1: Decision Dashboard — h(d), floor sweeping ──
function decision(d: number) {
  const pl = 12, pr = 50, pt = 14, pb = 16
  const X = (t: number) => pl + t * (W - pl - pr)
  const Y = (h: number) => pt + (1 - h) * (H - pt - pb)
  const hf = (t: number) => 0.82 * Math.exp(-0.6 * t)
  const hc = (t: number) => 0.72 * Math.exp(-1.05 * t)
  const ft = 0.18 + d * 0.5
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="hc-svg">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={pl} y1={pt + f * (H - pt - pb)} x2={W - pr} y2={pt + f * (H - pt - pb)} stroke="var(--line)" strokeWidth={1} />
      ))}
      <rect x={pl} y={pt} width={Math.max(0, X(ft) - pl)} height={H - pt - pb} fill={C_ACC} opacity={0.06} />
      <line x1={X(ft)} y1={pt} x2={X(ft)} y2={H - pb} stroke={C_ACC} strokeWidth={1.4} strokeDasharray="3 3" />
      <path d={line(hf, X, Y)} fill="none" stroke={C_FIN} strokeWidth={2.4} />
      <path d={line(hc, X, Y)} fill="none" stroke={C_CLI} strokeWidth={2.4} />
      <text x={W - pr + 5} y={Y(hf(1)) + 4} fill={C_FIN} className="hc-lbl">financial</text>
      <text x={W - pr + 5} y={Y(hc(1)) + 4} fill={C_CLI} className="hc-lbl">climate</text>
      <circle cx={X(ft)} cy={Y(hf(ft))} r={4} fill={C_FIN} stroke="#fff" strokeWidth={2} />
      <circle cx={X(ft)} cy={Y(hc(ft))} r={4} fill={C_CLI} stroke="#fff" strokeWidth={2} />
    </svg>
  )
}

// ── card 2: Hedge Budget — feasible corner, optimum sliding ──
function budget(d: number) {
  const pl = 30, pr = 14, pt = 14, pb = 18
  const X = (w1: number) => pl + ((w1 - 0.8) / 0.2) * (W - pl - pr)
  const Y = (w2: number) => H - pb - (w2 / 0.2) * (H - pt - pb)
  const w2 = 0.02 + d * 0.06
  const w1 = 0.985 - w2 - d * 0.01
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="hc-svg">
      {[0.85, 0.9, 0.95, 1].map((v) => (
        <line key={v} x1={X(v)} y1={pt} x2={X(v)} y2={H - pb} stroke="var(--line)" strokeWidth={1} />
      ))}
      {[0, 0.1, 0.2].map((v) => (
        <line key={v} x1={pl} y1={Y(v)} x2={W - pr} y2={Y(v)} stroke="var(--line)" strokeWidth={1} />
      ))}
      <line x1={X(1)} y1={Y(0)} x2={X(0.8)} y2={Y(0.2)} stroke="var(--muted)" strokeWidth={1} strokeDasharray="4 4" />
      <path d={`M${X(1)},${Y(0.01)} C${X(0.97)},${Y(0.05)} ${X(0.965)},${Y(0.12)} ${X(0.955)},${Y(0.2)}`} fill="none" stroke={C_ACC} strokeWidth={1.6} />
      <circle cx={X(w1)} cy={Y(w2)} r={5.5} fill={C_ACC} stroke="#fff" strokeWidth={2} />
      <text x={X(0.86)} y={Y(0.17)} className="hc-lbl" fill="var(--muted)">w₁+w₂=1</text>
    </svg>
  )
}

// ── card 3: Instruments — zero-cost collar payoff, cap breathing ──
function collar(d: number) {
  const pl = 12, pr = 48, pt = 14, pb = 18
  const X = (s: number) => pl + s * (W - pl - pr)
  const Y = (v: number) => H - pb - v * (H - pt - pb)
  const cap = 0.62 + d * 0.22
  const floor = 0.34 - d * 0.14
  const pay = (s: number) => Math.max(floor, Math.min(cap, s))
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="hc-svg">
      <rect x={pl} y={Y(cap)} width={W - pl - pr} height={Math.max(0, Y(floor) - Y(cap))} fill={C_FIN} opacity={0.07} />
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={pl} y1={pt + f * (H - pt - pb)} x2={W - pr} y2={pt + f * (H - pt - pb)} stroke="var(--line)" strokeWidth={1} />
      ))}
      <path d={line((s) => s, X, Y)} fill="none" stroke="var(--muted)" strokeWidth={1.4} strokeDasharray="4 4" />
      <path d={line(pay, X, Y)} fill="none" stroke={C_FIN} strokeWidth={2.6} />
      <text x={W - pr + 5} y={Y(cap) + 4} fill={C_FIN} className="hc-lbl">collar</text>
    </svg>
  )
}

// ── card 4: Exotic Desk — barrier squeeze, spot travelling the corridor ──
function exotic(d: number) {
  const pl = 14, pr = 48, pt = 16, pb = 20
  const X = (t: number) => pl + t * (W - pl - pr)
  const Y = (v: number) => pt + (1 - v) * (H - pt - pb)
  // U-shaped KO probability across the corridor; spot travels left→right→left
  const ko = (t: number) => 0.30 + 0.62 * Math.abs(2 * t - 1) ** 1.5
  const st = d
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="hc-svg">
      <line x1={X(0)} y1={pt} x2={X(0)} y2={H - pb} stroke={C_AMBER} strokeWidth={1.4} />
      <line x1={X(1)} y1={pt} x2={X(1)} y2={H - pb} stroke={C_AMBER} strokeWidth={1.4} />
      <text x={X(0) + 3} y={pt + 9} className="hc-lbl" fill={C_AMBER}>L</text>
      <text x={X(1) - 9} y={pt + 9} className="hc-lbl" fill={C_AMBER}>U</text>
      <path d={line(ko, X, Y)} fill="none" stroke={C_AMBER} strokeWidth={2.4} />
      <line x1={X(st)} y1={pt} x2={X(st)} y2={H - pb} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" />
      <circle cx={X(st)} cy={Y(ko(st))} r={4.5} fill={C_AMBER} stroke="#fff" strokeWidth={2} />
      <text x={W - pr + 5} y={Y(ko(1)) + 4} fill={C_AMBER} className="hc-lbl">KO prob</text>
    </svg>
  )
}

// ── card 5: Hedge Accounting — cumulative ineffectiveness, revealed ──
function accounting(d: number) {
  const pl = 14, pr = 46, pt = 14, pb = 16
  const X = (t: number) => pl + t * (W - pl - pr)
  const Y = (v: number) => H - pb - v * (H - pt - pb)
  const A = (t: number) => 0.18 + 0.12 * t + 0.62 * Math.max(0, t - 0.78) / 0.22
  const B = (t: number) => 0.14 - 0.04 * t
  const reveal = 0.15 + d * 0.85
  const seg = (f: (t: number) => number) =>
    Array.from({ length: 41 }, (_, i) => {
      const t = (i / 40) * reveal
      return `${i ? 'L' : 'M'}${X(t).toFixed(1)},${Y(f(t)).toFixed(1)}`
    }).join('')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="hc-svg">
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={pl} y1={pt + f * (H - pt - pb)} x2={W - pr} y2={pt + f * (H - pt - pb)} stroke="var(--line)" strokeWidth={1} />
      ))}
      <path d={seg(A)} fill="none" stroke={C_FIN} strokeWidth={2.4} />
      <path d={seg(B)} fill="none" stroke={C_CLI} strokeWidth={2.4} />
      <text x={W - pr + 5} y={Y(A(reveal)) + 2} fill={C_FIN} className="hc-lbl">A</text>
      <text x={W - pr + 5} y={Y(B(reveal)) + 6} fill={C_CLI} className="hc-lbl">B</text>
    </svg>
  )
}

const CARDS: Card[] = [
  {
    url: 'Decision Dashboard · d* × h*',
    chartTitle: 'Hedge ratios vs disclosure · h(d)',
    tiles: (d) => {
      const ft = 0.18 + d * 0.5
      return [
        { l: 'Disclosure d*', v: (0.4 + ft * 1.15).toFixed(2) },
        { l: 'Financial h_f*', v: `${Math.round(0.82 * Math.exp(-0.6 * ft) * 100)}%`, c: C_FIN },
        { l: 'Climate h_c*', v: `${Math.round(0.72 * Math.exp(-1.05 * ft) * 100)}%`, c: C_CLI },
      ]
    },
    draw: decision,
  },
  {
    url: 'Hedge Budget · coverage split',
    chartTitle: 'Feasible corner & the optimum',
    tiles: (d) => {
      const w2 = 0.02 + d * 0.06
      const w1 = 0.985 - w2 - d * 0.01
      return [
        { l: 'WTI w₁*', v: `${(w1 * 100).toFixed(1)}%`, c: C_FIN },
        { l: 'FX w₂*', v: `${(w2 * 100).toFixed(1)}%`, c: C_CLI },
        { l: 'Total cost', v: `₩${(42 + d * 6).toFixed(0)}bn` },
      ]
    },
    draw: budget,
  },
  {
    url: 'Hedge Instruments · zero-cost collar',
    chartTitle: 'Effective purchase cost at expiry',
    tiles: (d) => {
      const cap = 90 + d * 24
      const floor = 72 - d * 12
      return [
        { l: 'Cap (call)', v: `$${cap.toFixed(0)}`, c: C_FIN },
        { l: 'Floor (put)', v: `$${floor.toFixed(0)}` },
        { l: 'Net premium', v: '$0.00', c: C_ACC },
      ]
    },
    draw: collar,
  },
  {
    url: 'Exotic Desk · barrier monitor',
    chartTitle: 'The barrier squeeze',
    tiles: (d) => {
      const ko = (0.30 + 0.62 * Math.abs(2 * d - 1) ** 1.5) * 100
      return [
        { l: 'KO probability', v: `${ko.toFixed(0)}%`, c: C_AMBER },
        { l: 'Status', v: ko > 70 ? 'Critical' : ko > 50 ? 'Elevated' : 'Watch', c: C_AMBER },
        { l: 'c* multiplier', v: '−0.55' },
      ]
    },
    draw: exotic,
  },
  {
    url: 'Hedge Accounting · A vs B',
    chartTitle: 'Cumulative ineffectiveness in P&L',
    tiles: () => [
      { l: '|ineff| A', v: '₩23.4bn', c: C_FIN },
      { l: '|ineff| B', v: '₩6.4bn', c: C_CLI },
      { l: 'B vs A', v: '3.7×' },
    ],
    draw: accounting,
  },
]

export default function AppPreview() {
  const [idx, setIdx] = useState(0)
  const [dial, setDial] = useState(0.5)
  const [paused, setPaused] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const touchX = useRef<number | null>(null)
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // internal dial — the looping "gif" motion inside the active card
  useEffect(() => {
    if (reduced) return
    let raf = 0
    let last = 0
    const start = performance.now()
    const tick = (now: number) => {
      const v = 0.5 - 0.5 * Math.cos(((now - start) / 3600) * Math.PI * 2)
      if (Math.abs(v - last) > 0.004) {
        last = v
        setDial(v)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reduced])

  // auto-advance every 5s unless paused; resets whenever idx changes
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => setIdx((i) => (i + 1) % CARDS.length), 2700)
    return () => clearTimeout(t)
  }, [idx, paused])

  // parallax drift on scroll
  useEffect(() => {
    if (reduced) return
    const el = rootRef.current
    if (!el) return
    let raf = 0
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const off = Math.max(-40, Math.min(40, (window.scrollY - 120) * 0.06))
        el.style.setProperty('--sy', `${off}px`)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [reduced])

  const go = (dir: 1 | -1) => setIdx((i) => (i + dir + CARDS.length) % CARDS.length)
  const card = CARDS[idx]
  const tiles = card.tiles(dial)

  return (
    <div
      className="ap"
      ref={rootRef}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="ap-stack"
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          // ±40px horizontal swipe flips a card; go() changes idx, which resets
          // the auto-advance timer via its effect dependency
          const dx = e.changedTouches[0].clientX - touchX.current
          touchX.current = null
          if (dx > 40) go(-1)
          else if (dx < -40) go(1)
        }}
      >
        <span className="ap-ghost ap-ghost-2" aria-hidden />
        <span className="ap-ghost ap-ghost-1" aria-hidden />

        <button className="ap-arrow left" aria-label="Previous screen" onClick={() => go(-1)}>‹</button>
        <button className="ap-arrow right" aria-label="Next screen" onClick={() => go(1)}>›</button>

        <div className="ap-window" key={idx}>
          <div className="ap-bar">
            <span className="ap-dot" />
            <span className="ap-dot" />
            <span className="ap-dot" />
            <span className="ap-url">{card.url}</span>
          </div>
          <div className="ap-body">
            <div className="ap-tiles">
              {tiles.map((t) => (
                <div className="ap-tile" key={t.l}>
                  <span className="ap-tl">{t.l}</span>
                  <span className="ap-tv" style={t.c ? { color: t.c } : undefined}>{t.v}</span>
                </div>
              ))}
            </div>
            <div className="ap-chart">
              <div className="ap-chart-h">{card.chartTitle}</div>
              {card.draw(dial)}
            </div>
          </div>
        </div>
      </div>

      <div className="ap-foot">
        <div className="ap-dots" role="tablist" aria-label="Choose screen">
          {CARDS.map((c, i) => (
            <button
              key={c.url}
              className={i === idx ? 'ap-pip active' : 'ap-pip'}
              aria-label={c.url}
              aria-selected={i === idx}
              role="tab"
              onClick={() => setIdx(i)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
