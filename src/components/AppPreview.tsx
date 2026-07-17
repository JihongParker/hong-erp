import { useEffect, useRef, useState, type ReactElement } from 'react'
import './AppPreview.css'

// Hero stage: a live photocard stack. Each card is a miniature of one module,
// its picture continuously morphing under an internal "dial" (a looping value
// that plays the module's key motion like a gif). Left/right arrows flip cards;
// it auto-advances every 2.7s, pausing for 8s after any manual interaction
// (hover alone never pauses it — the cursor naturally rests on the stage).
// The stack tilts in perspective and drifts on scroll (parallax). Decorative —
// the real screens are one click away — and reduced-motion safe.

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
      {/* feasible sliver between the cost boundary and the envelope */}
      <path d={`M${X(1)},${Y(0.01)} C${X(0.97)},${Y(0.05)} ${X(0.965)},${Y(0.12)} ${X(0.955)},${Y(0.2)} L${X(0.8)},${Y(0.2)} L${X(1)},${Y(0)}Z`} fill={C_ACC} opacity={0.06} />
      <path d={`M${X(1)},${Y(0.01)} C${X(0.97)},${Y(0.05)} ${X(0.965)},${Y(0.12)} ${X(0.955)},${Y(0.2)}`} fill="none" stroke={C_ACC} strokeWidth={1.6} />
      <circle cx={X(w1)} cy={Y(w2)} r={10} fill={C_ACC} opacity={0.16} />
      <circle cx={X(w1)} cy={Y(w2)} r={5.5} fill={C_ACC} stroke="#fff" strokeWidth={2} />
      <text x={X(0.955) + 4} y={Y(0.055)} className="hc-lbl" fill={C_ACC}>C = B</text>
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
      <path d={line(pay, X, Y)} fill="none" stroke={C_FIN} strokeWidth={2.6} strokeLinecap="round" />
      {/* kink markers: where the sold floor and bought cap take over */}
      <circle cx={X(floor)} cy={Y(floor)} r={3.5} fill={C_FIN} stroke="#fff" strokeWidth={1.5} />
      <circle cx={X(cap)} cy={Y(cap)} r={3.5} fill={C_FIN} stroke="#fff" strokeWidth={1.5} />
      <text x={W - pr + 5} y={Y(cap) + 4} fill={C_FIN} className="hc-lbl">cap</text>
      <text x={W - pr + 5} y={Y(floor) + 4} fill={C_FIN} className="hc-lbl" opacity={0.7}>floor</text>
    </svg>
  )
}

// ── card 4: Exotic Desk — the barrier squeeze in full: value hump collapsing
// into the barriers, KO-probability bed underneath, and the delta tangent
// flipping sign as spot walks the corridor ──
const exoticVal = (t: number) => (t ** 1.5 * (1 - t) ** 0.7) / (0.62 ** 1.5 * 0.38 ** 0.7)
const exoticKoP = (t: number) => 0.22 + 0.66 * Math.abs(2 * t - 1) ** 1.6
function exotic(d: number) {
  const pl = 14, pr = 48, pt = 16, pb = 20
  const X = (t: number) => pl + t * (W - pl - pr)
  const Y = (v: number) => pt + (1 - v) * (H - pt - pb)
  // keep the travelling spot off the exact barriers so the marker stays readable
  const st = 0.06 + d * 0.88
  const slope = (exoticVal(st + 0.01) - exoticVal(st - 0.01)) / 0.02
  // unit tangent segment at the spot — the delta the textbook can't see
  const dxN = 16 / Math.hypot(1, slope * 0.4)
  const dyN = dxN * slope * 0.4
  const area =
    Array.from({ length: 41 }, (_, i) => {
      const t = i / 40
      return `${i ? 'L' : 'M'}${X(t).toFixed(1)},${Y(exoticKoP(t) * 0.45).toFixed(1)}`
    }).join('') + `L${X(1).toFixed(1)},${Y(0)}L${X(0).toFixed(1)},${Y(0)}Z`
  const nearBarrier = Math.min(st, 1 - st) < 0.18
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="hc-svg">
      <defs>
        {/* dead zones: the corridor edges fade to amber where value dies */}
        <linearGradient id="apx-dead-l" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C_AMBER} stopOpacity="0.16" />
          <stop offset="1" stopColor={C_AMBER} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="apx-dead-r" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C_AMBER} stopOpacity="0" />
          <stop offset="1" stopColor={C_AMBER} stopOpacity="0.16" />
        </linearGradient>
      </defs>
      <rect x={X(0)} y={pt} width={X(0.14) - X(0)} height={H - pt - pb} fill="url(#apx-dead-l)" />
      <rect x={X(0.86)} y={pt} width={X(1) - X(0.86)} height={H - pt - pb} fill="url(#apx-dead-r)" />
      {/* KO-probability bed under everything */}
      <path d={area} fill={C_AMBER} opacity={0.14} />
      {/* barriers, breathing when the spot closes in */}
      <line x1={X(0)} y1={pt} x2={X(0)} y2={H - pb} stroke={C_AMBER} strokeWidth={st < 0.18 ? 2.4 : 1.4} opacity={st < 0.18 ? 1 : 0.75} />
      <line x1={X(1)} y1={pt} x2={X(1)} y2={H - pb} stroke={C_AMBER} strokeWidth={st > 0.82 ? 2.4 : 1.4} opacity={st > 0.82 ? 1 : 0.75} />
      <text x={X(0) + 3} y={pt + 9} className="hc-lbl" fill={C_AMBER}>L</text>
      <text x={X(1) - 9} y={pt + 9} className="hc-lbl" fill={C_AMBER}>U</text>
      {/* the value hump — rises with spot, then the squeeze tears it down */}
      <path d={line((t) => exoticVal(t) * 0.9, X, (v) => Y(v))} fill="none" stroke={C_FIN} strokeWidth={2.6} strokeLinecap="round" />
      {/* spot guide + marker + delta tangent (flips sign past the peak) */}
      <line x1={X(st)} y1={pt} x2={X(st)} y2={H - pb} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" />
      <line
        x1={X(st) - dxN} y1={Y(exoticVal(st) * 0.9) + dyN * 0.9}
        x2={X(st) + dxN} y2={Y(exoticVal(st) * 0.9) - dyN * 0.9}
        stroke={slope < 0 ? C_AMBER : C_ACC} strokeWidth={2.4} strokeLinecap="round"
      />
      <circle cx={X(st)} cy={Y(exoticVal(st) * 0.9)} r={4.5} fill={slope < 0 ? C_AMBER : C_ACC} stroke="#fff" strokeWidth={2} />
      <text x={W - pr + 5} y={Y(exoticVal(1) * 0.9 + 0.08) + 4} fill={C_FIN} className="hc-lbl">value</text>
      <text x={W - pr + 5} y={Y(exoticKoP(1) * 0.45) + 4} fill={C_AMBER} className="hc-lbl">KO prob</text>
      {nearBarrier && (
        <text x={X(st) + (st > 0.5 ? -46 : 6)} y={pt + 9} className="hc-lbl" fill={C_AMBER}>Δ flips</text>
      )}
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
      <path d={seg(A)} fill="none" stroke={C_FIN} strokeWidth={2.4} strokeLinecap="round" />
      <path d={seg(B)} fill="none" stroke={C_CLI} strokeWidth={2.4} strokeLinecap="round" />
      {/* the knock-out event: A's ineffectiveness kinks upward here */}
      {reveal > 0.78 && (
        <>
          <line x1={X(0.78)} y1={pt} x2={X(0.78)} y2={H - pb} stroke={C_AMBER} strokeWidth={1} strokeDasharray="3 3" opacity={0.8} />
          <circle cx={X(0.78)} cy={Y(A(0.78))} r={3.5} fill={C_AMBER} stroke="#fff" strokeWidth={1.5} />
          <text x={X(0.78) + 4} y={pt + 9} className="hc-lbl" fill={C_AMBER}>KO</text>
        </>
      )}
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
      const st = 0.06 + d * 0.88
      const ko = exoticKoP(st) * 100
      const delta = Math.round(((exoticVal(st + 0.01) - exoticVal(st - 0.01)) / 0.02) * 90)
      return [
        { l: 'KO probability', v: `${ko.toFixed(0)}%`, c: C_AMBER },
        { l: 'Δ WTI', v: `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`, c: delta < 0 ? C_AMBER : C_ACC },
        { l: 'Status', v: ko > 70 ? 'Critical' : ko > 50 ? 'Elevated' : 'Watch', c: C_AMBER },
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

  // auto-advance every 2.7s; resets whenever idx changes. `paused` is only
  // set by manual interaction (arrows, pips, swipe) and clears itself after 8s
  // — hover must NOT pause, or the stage freezes whenever the cursor rests on it.
  useEffect(() => {
    if (paused) return
    const t = setTimeout(() => setIdx((i) => (i + 1) % CARDS.length), 2700)
    return () => clearTimeout(t)
  }, [idx, paused])

  const holdT = useRef<number | undefined>(undefined)
  const hold = () => {
    setPaused(true)
    window.clearTimeout(holdT.current)
    holdT.current = window.setTimeout(() => setPaused(false), 8000)
  }
  useEffect(() => () => window.clearTimeout(holdT.current), [])

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

  const go = (dir: 1 | -1) => {
    hold()
    setIdx((i) => (i + dir + CARDS.length) % CARDS.length)
  }
  const card = CARDS[idx]
  const tiles = card.tiles(dial)

  return (
    <div className="ap" ref={rootRef}>
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
              onClick={() => {
                hold()
                setIdx(i)
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
