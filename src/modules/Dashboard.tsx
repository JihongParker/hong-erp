import { useEffect, useMemo, useRef, useState } from 'react'
import {
  hedgeAt,
  lambdaOf,
  solveEquilibrium,
  type ModelParams,
} from '../engine/model'
import { Chip, useSpine } from '../state/spine'
import { timeAgo, useErp } from '../state/erp'
import Activity from '../components/Activity'
import './Dashboard.css'

// Series colors — from the validated palette; color follows the entity
// (financial leg / climate leg) across every chart in the app.
const C_FIN = '#2f6db4'
const C_CLI = '#2e7d52'
const C_COST = ['#2f6db4', '#b3610f', '#2e7d52'] // hedge / disclosure / residual

// Defaults chosen for an instructive interior equilibrium:
// d* ≈ 0.83, h_f ≈ 68%, h_c ≈ 46% — both margins visibly open.
const DEFAULTS: ModelParams = {
  sigmaF: 1.0,
  sigmaC: 0.6,
  rho: 0.3,
  pF: 3.0,
  pC: 1.8,
  a: 0.4,
  phi: 0.5,
  lambda: 6,
  k: 0.8,
  dFloor: 0,
}

const GROUPS: {
  title: string
  params: { key: keyof ModelParams; label: string; min: number; max: number; step: number }[]
}[] = [
  {
    title: 'Exposure',
    params: [
      { key: 'sigmaF', label: 'σf financial vol', min: 0.2, max: 3, step: 0.05 },
      { key: 'sigmaC', label: 'σc climate vol', min: 0.2, max: 3, step: 0.05 },
      { key: 'rho', label: 'ρ correlation', min: -0.9, max: 0.9, step: 0.05 },
    ],
  },
  {
    title: 'Hedge premia',
    params: [
      { key: 'pF', label: 'p_f financial', min: 0.05, max: 4, step: 0.05 },
      { key: 'pC', label: 'p_c climate', min: 0.05, max: 4, step: 0.05 },
    ],
  },
  {
    title: 'Disclosure & penalty',
    params: [
      { key: 'a', label: 'a disclosure cost', min: 0.1, max: 5, step: 0.1 },
      { key: 'phi', label: 'φ distress price', min: 0, max: 3, step: 0.05 },
      { key: 'lambda', label: 'λ stringency', min: 0, max: 12, step: 0.25 },
      { key: 'k', label: 'k attenuation', min: 0.1, max: 2, step: 0.05 },
    ],
  },
  {
    title: 'Regulation',
    params: [{ key: 'dFloor', label: 'd̲ mandated floor', min: 0, max: 5, step: 0.1 }],
  },
]

// ── chart geometry ──
const CW = 640
const CH = 300
const PAD = { top: 14, right: 96, bottom: 34, left: 46 }

export default function Dashboard() {
  const [p, setP] = useState<ModelParams>(DEFAULTS)
  const [hoverD, setHoverD] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const eq = useMemo(() => solveEquilibrium(p), [p])
  const spine = useSpine()
  const { state: erp } = useErp()
  const divBook = useMemo(
    () =>
      erp.divisions.map((d) => {
        const sol = solveEquilibrium(d.params)
        const metrics = erp.metrics.filter((m) => m.division === d.id)
        const trades = erp.trades.filter((t) => t.division === d.id)
        const lastTs = Math.max(0, ...metrics.map((m) => m.ts), ...trades.map((t) => t.ts))
        return {
          id: d.id,
          name: d.name,
          head: d.head,
          dStar: sol.dStar,
          hF: sol.hF,
          approved: metrics.filter((m) => m.status === 'approved').length,
          pending: metrics.filter((m) => m.status === 'pending').length,
          trades: trades.length,
          lastTs,
        }
      }),
    [erp],
  )

  useEffect(() => {
    spine.publish({ dStar: eq.dStar, floorBinding: eq.floorBinding })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eq.dStar, eq.floorBinding])

  const dMax = Math.max(2.5 * Math.max(eq.dStar, p.dFloor, 0.8), 2)
  const curve = useMemo(() => {
    const N = 160
    return Array.from({ length: N + 1 }, (_, i) => {
      const d = (i / N) * dMax
      const h = hedgeAt(d, p)
      return { d, hF: h.hF, hC: h.hC, lam: lambdaOf(d, p) }
    })
  }, [p, dMax])

  const x = (d: number) => PAD.left + (d / dMax) * (CW - PAD.left - PAD.right)
  const y = (h: number) => CH - PAD.bottom - h * (CH - PAD.top - PAD.bottom)
  const path = (key: 'hF' | 'hC') =>
    curve.map((pt, i) => `${i ? 'L' : 'M'}${x(pt.d).toFixed(1)},${y(pt[key]).toFixed(1)}`).join('')

  const hoverPt = hoverD == null ? null : curve[Math.round((hoverD / dMax) * 160)]

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const fx = ((e.clientX - rect.left) / rect.width) * CW
    const d = ((fx - PAD.left) / (CW - PAD.left - PAD.right)) * dMax
    setHoverD(d < 0 || d > dMax ? null : d)
  }

  const set = (key: keyof ModelParams, v: number) => setP((prev) => ({ ...prev, [key]: v }))

  const costTotal = eq.costs.total
  const costSegs = [
    { name: 'Hedge premium', v: eq.costs.hedge },
    { name: 'Disclosure cost', v: eq.costs.disclosure },
    { name: 'Residual risk', v: eq.costs.residual },
  ]

  return (
    <div className="db">
      <div className="spine-row">
        <Chip from="Materiality">
          <strong>{spine.materialCount}</strong> material risks (≥{spine.materialityThreshold.toFixed(1)}) feed the exposure parameters
        </Chip>
        <Chip from="Budget">
          allocator split <strong>{(spine.budgetW1 * 100).toFixed(1)}% / {(spine.budgetW2 * 100).toFixed(1)}%</strong> WTI/FX
        </Chip>
      </div>
      <div className="db-grid">
        <div className="db-tiles">
          <div className="tile">
            <span className="tile-label">Disclosure d*</span>
            <span className="tile-value">{eq.dStar.toFixed(2)}</span>
            <span className={eq.floorBinding ? 'tile-badge binding' : 'tile-badge'}>
                {eq.floorBinding ? 'floor binding' : 'voluntary interior'}
              </span>
          </div>
          <div className="tile">
            <span className="tile-label">Financial hedge h_f*</span>
            <span className="tile-value" style={{ color: C_FIN }}>
                {(eq.hF * 100).toFixed(0)}%
              </span>
          </div>
          <div className="tile">
            <span className="tile-label">Climate hedge h_c*</span>
            <span className="tile-value" style={{ color: C_CLI }}>
                {(eq.hC * 100).toFixed(0)}%
              </span>
          </div>
          <div className="tile">
            <span className="tile-label">Risk price Λ(d*)</span>
            <span className="tile-value">{eq.lambdaAtD.toFixed(2)}</span>
          </div>
        </div>

        {/* ── parameters ── */}
        <div className="db-panel db-params">
          {GROUPS.map((g) => (
            <div key={g.title} className="db-group" data-tour={g.title === 'Regulation' ? 'floor' : undefined}>
              <h4>{g.title}</h4>
              {g.params.map((m) => (
                <label key={m.key}>
                  <span className="db-plabel">{m.label}</span>
                  <input
                    type="range"
                    min={m.min}
                    max={m.max}
                    step={m.step}
                    value={p[m.key]}
                    onChange={(e) => set(m.key, Number(e.target.value))}
                  />
                  <span className="db-pval">{p[m.key].toFixed(2)}</span>
                </label>
              ))}
            </div>
          ))}
          <button className="db-reset" onClick={() => setP(DEFAULTS)}>
            Reset defaults
          </button>
        </div>

        {/* ── results ── */}
        <div className="db-main">

          {/* hedge at a glance */}
          <div className="db-panel">
            <h3>The hedge, at a glance</h3>
            {(
              [
                { name: 'Financial leg', h: eq.hF, c: C_FIN },
                { name: 'Climate leg', h: eq.hC, c: C_CLI },
              ] as const
            ).map((leg) => (
              <div key={leg.name} className="hedge-row">
                <span className="hedge-name">{leg.name}</span>
                <div className="hedge-track">
                  <div
                    className="hedge-fill"
                    style={{ width: `${leg.h * 100}%`, background: leg.c }}
                  />
                  {leg.h < 0.82 && (
                    <span className="hedge-open" style={{ left: `${leg.h * 100}%` }}>
                      open {(100 - leg.h * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <span className="hedge-num">{(leg.h * 100).toFixed(0)}%</span>
              </div>
            ))}
            {eq.floorBinding && (
              <p className="db-callout">
                The mandated floor d̲ = {p.dFloor.toFixed(1)} binds (voluntary
                optimum {eq.dVoluntary.toFixed(2)}): forced disclosure buys
                penalty relief, cheapens residual risk, and <em>crowds out</em>{' '}
                the hedge — move the floor slider and watch both bars shrink.
              </p>
            )}
          </div>

          {/* h(d) curve */}
          <figure className="db-panel db-plot">
            <h3>Hedge ratios as disclosure varies — h(d)</h3>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CW} ${CH}`}
              role="img"
              aria-label="Hedge ratios as a function of disclosure intensity"
              onMouseMove={onMove}
              onMouseLeave={() => setHoverD(null)}
            >
              {/* grid */}
              {[0, 0.25, 0.5, 0.75, 1].map((v) => (
                <g key={v}>
                  <line x1={PAD.left} y1={y(v)} x2={CW - PAD.right} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
                  <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="tick">
                    {(v * 100).toFixed(0)}%
                  </text>
                </g>
              ))}
              {[0.25, 0.5, 0.75, 1].map((f) => (
                <text key={f} x={x(f * dMax)} y={CH - PAD.bottom + 18} textAnchor="middle" className="tick">
                  {(f * dMax).toFixed(1)}
                </text>
              ))}
              <text x={(PAD.left + CW - PAD.right) / 2} y={CH - 4} textAnchor="middle" className="axis-title">
                disclosure intensity d →
              </text>

              {/* mandated-floor region */}
              {p.dFloor > 0 && (
                <>
                  <rect x={PAD.left} y={PAD.top} width={Math.max(0, x(Math.min(p.dFloor, dMax)) - PAD.left)} height={CH - PAD.top - PAD.bottom} fill="var(--accent)" opacity={0.05} />
                  <line x1={x(Math.min(p.dFloor, dMax))} y1={PAD.top} x2={x(Math.min(p.dFloor, dMax))} y2={CH - PAD.bottom} stroke="var(--accent)" strokeWidth={1.5} />
                  <text x={x(Math.min(p.dFloor, dMax)) + 4} y={PAD.top + 12} className="marker-label accent">
                    floor d̲
                  </text>
                </>
              )}

              {/* voluntary optimum marker */}
              <line x1={x(eq.dVoluntary)} y1={PAD.top} x2={x(eq.dVoluntary)} y2={CH - PAD.bottom} stroke="var(--muted)" strokeWidth={1} strokeDasharray="4 4" />
              <text x={x(eq.dVoluntary) + 4} y={PAD.top + 26} className="marker-label">
                voluntary d*
              </text>

              {/* series (2px lines) + direct labels at line end */}
              <path d={path('hF')} fill="none" stroke={C_FIN} strokeWidth={2} />
              <path d={path('hC')} fill="none" stroke={C_CLI} strokeWidth={2} />
              <text x={CW - PAD.right + 6} y={y(curve[curve.length - 1].hF) + 4} className="series-label" fill={C_FIN}>
                financial
              </text>
              <text x={CW - PAD.right + 6} y={y(curve[curve.length - 1].hC) + 4} className="series-label" fill={C_CLI}>
                climate
              </text>

              {/* equilibrium dots (2px surface ring) */}
              <circle cx={x(eq.dStar)} cy={y(eq.hF)} r={5} fill={C_FIN} stroke="var(--panel)" strokeWidth={2} />
              <circle cx={x(eq.dStar)} cy={y(eq.hC)} r={5} fill={C_CLI} stroke="var(--panel)" strokeWidth={2} />

              {/* crosshair */}
              {hoverPt && (
                <>
                  <line x1={x(hoverPt.d)} y1={PAD.top} x2={x(hoverPt.d)} y2={CH - PAD.bottom} stroke="var(--muted)" strokeWidth={1} opacity={0.5} />
                  <circle cx={x(hoverPt.d)} cy={y(hoverPt.hF)} r={4} fill={C_FIN} stroke="var(--panel)" strokeWidth={2} />
                  <circle cx={x(hoverPt.d)} cy={y(hoverPt.hC)} r={4} fill={C_CLI} stroke="var(--panel)" strokeWidth={2} />
                </>
              )}
            </svg>
            {hoverPt && (
              <div className="db-tooltip" style={{ left: `${(x(hoverPt.d) / CW) * 100}%` }}>
                d = {hoverPt.d.toFixed(2)} · h_f {(hoverPt.hF * 100).toFixed(1)}% · h_c{' '}
                {(hoverPt.hC * 100).toFixed(1)}% · Λ {hoverPt.lam.toFixed(2)}
              </div>
            )}
            <figcaption className="db-legend">
              <span className="lg-item">
                <span className="dot" style={{ background: C_FIN }} /> Financial hedge h_f
              </span>
              <span className="lg-item">
                <span className="dot" style={{ background: C_CLI }} /> Climate hedge h_c
              </span>
              <span className="lg-note">
                Both curves fall as d rises — disclosure cheapens residual risk
                (Λ↓) and substitutes for hedging. Dots mark the equilibrium.
              </span>
            </figcaption>
          </figure>

          {/* cost decomposition */}
          <div className="db-panel">
            <h3>Cost at the optimum</h3>
            <div className="cost-bar">
              {costSegs.map((s, i) => (
                <div
                  key={s.name}
                  className="cost-seg"
                  style={{ width: `${(s.v / costTotal) * 100}%`, background: C_COST[i] }}
                  title={`${s.name}: ${s.v.toFixed(2)}`}
                />
              ))}
            </div>
            <div className="db-legend">
              {costSegs.map((s, i) => (
                <span key={s.name} className="lg-item">
                  <span className="dot" style={{ background: C_COST[i] }} /> {s.name}{' '}
                  <strong>{s.v.toFixed(2)}</strong>
                </span>
              ))}
              <span className="lg-item">
                Total <strong>{costTotal.toFixed(2)}</strong>
              </span>
            </div>
          </div>

          <div className="db-ops">
            <div className="db-panel">
              <h3>Division book</h3>
              <div className="db-divs">
                {divBook.map((d) => (
                  <div key={d.id} className="db-div">
                    <div className="db-div-head">
                      <strong>{d.name}</strong>
                      <span className="db-div-owner">{d.head}</span>
                    </div>
                    <div className="db-div-stats">
                      <span>d* <strong>{d.dStar.toFixed(2)}</strong></span>
                      <span>h_f* <strong>{(d.hF * 100).toFixed(0)}%</strong></span>
                    </div>
                    <div className="db-div-meta">
                      {d.approved} approved{d.pending > 0 && <> · <em>{d.pending} pending</em></>} · {d.trades} {d.trades === 1 ? 'trade' : 'trades'}
                      {d.lastTs > 0 && <> · {timeAgo(d.lastTs)}</>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="db-panel">
              <h3>Recent activity</h3>
              <Activity limit={6} />
            </div>
          </div>

          <p className="db-note">
            The model: Λ(d) = φ + λe<sup>−kd</sup> prices residual risk; hedges
            solve 2Λ(d)Σu = p with corner (KKT) handling; voluntary d* solves
            2ad = kλe<sup>−kd</sup>R; a mandate is a floor d ≥ d̲. Incumbent ESG
            platforms stop at reporting the inputs — this screen is the decision
            layer they leave empty.
          </p>
        </div>
      </div>
    </div>
  )
}
