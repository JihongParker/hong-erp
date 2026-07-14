import { useMemo, useState } from 'react'
import surface from '../data/exotic_surface.json'
import './ExoticDesk.css'

// Precomputed from the paper's own model & calibration (see meta in the JSON;
// generator: modeling/python/02_delta/export_erp_surface.py). Anchor: KO prob
// 0.4349 at baseline vs the paper's European engine 0.4369.
const S_GRID = surface.sGrid as number[]
const T_GRID = surface.tGrid as number[]
const PRICE = surface.price as number[][]
const DELTA = surface.deltaWTI as number[][]
const KO = surface.koProb as number[][]
const META = surface.meta as { calibration: { U: number; L: number; K: number; S2_0: number } }
const { U, L, K, S2_0 } = META.calibration

// paper constants (Park_quanto): covariance-aware FX multiplier and KO rates
const C_STAR = -0.548
const PAPER = { koEU: 0.4369, koAM: 0.2309, basePremiumAM: 17132.47 }

function interp1(grid: number[], values: number[], x: number): number {
  if (x <= grid[0]) return values[0]
  if (x >= grid[grid.length - 1]) return values[values.length - 1]
  let i = 0
  while (grid[i + 1] < x) i++
  const w = (x - grid[i]) / (grid[i + 1] - grid[i])
  return values[i] * (1 - w) + values[i + 1] * w
}

function atSpot(row: number[], s: number): number {
  return interp1(S_GRID, row, s)
}

type Risk = { label: string; cls: string; icon: string }
function koRisk(p: number): Risk {
  if (p < 0.25) return { label: 'Low', cls: 'ok', icon: '●' }
  if (p < 0.5) return { label: 'Elevated', cls: 'warn', icon: '▲' }
  if (p < 0.75) return { label: 'Serious', cls: 'serious', icon: '▲' }
  return { label: 'Critical', cls: 'critical', icon: '■' }
}

// small single-series curve chart
const CW = 560
const CH = 190
const PAD = { top: 12, right: 14, bottom: 30, left: 56 }

function Curve({
  values,
  color,
  spot,
  fmt,
  yMaxHint,
}: {
  values: number[]
  color: string
  spot: number
  fmt: (v: number) => string
  yMaxHint?: number
}) {
  const yMax = yMaxHint ?? Math.max(...values) * 1.08
  const x = (s: number) => PAD.left + ((s - L) / (U - L)) * (CW - PAD.left - PAD.right)
  const y = (v: number) => CH - PAD.bottom - (v / yMax) * (CH - PAD.top - PAD.bottom)
  const d = S_GRID.map((s, i) => `${i ? 'L' : 'M'}${x(s).toFixed(1)},${y(values[i]).toFixed(1)}`).join('')
  const spotV = atSpot(values, spot)
  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} role="img">
      {/* barrier dead zones */}
      <rect x={PAD.left} y={PAD.top} width={x(S_GRID[0]) - PAD.left} height={CH - PAD.top - PAD.bottom} fill="var(--accent)" opacity={0.08} />
      <rect x={x(S_GRID[S_GRID.length - 1])} y={PAD.top} width={CW - PAD.right - x(S_GRID[S_GRID.length - 1])} height={CH - PAD.top - PAD.bottom} fill="var(--accent)" opacity={0.08} />
      {[L, K, U].map((v) => (
        <g key={v}>
          <line x1={x(v)} y1={PAD.top} x2={x(v)} y2={CH - PAD.bottom} stroke={v === K ? 'var(--line)' : 'var(--accent)'} strokeWidth={1} strokeDasharray={v === K ? '3 3' : undefined} />
          <text x={x(v)} y={CH - PAD.bottom + 14} textAnchor="middle" className="tick">{v}</text>
        </g>
      ))}
      {[0.5, 1].map((f) => (
        <text key={f} x={PAD.left - 6} y={y(yMax * f / 1.08) + 4} textAnchor="end" className="tick">{fmt(yMax * f / 1.08)}</text>
      ))}
      <path d={d} fill="none" stroke={color} strokeWidth={2} />
      <line x1={x(spot)} y1={PAD.top} x2={x(spot)} y2={CH - PAD.bottom} stroke="var(--muted)" strokeWidth={1} opacity={0.6} />
      <circle cx={x(spot)} cy={y(Math.min(spotV, yMax))} r={5} fill={color} stroke="var(--panel)" strokeWidth={2} />
    </svg>
  )
}

export default function ExoticDesk() {
  const [spot, setSpot] = useState(78.94)
  const [ti, setTi] = useState(0)

  const row = useMemo(
    () => ({ price: PRICE[ti], delta: DELTA[ti], ko: KO[ti] }),
    [ti],
  )
  const v = atSpot(row.price, spot)
  const dWti = atSpot(row.delta, spot)
  const koP = atSpot(row.ko, spot)
  const dFx = v / S2_0 // homogeneity theorem: structural FX delta = V/S2
  const risk = koRisk(koP)
  const distU = ((U - spot) / spot) * 100
  const distL = ((spot - L) / spot) * 100

  return (
    <div className="ex">
      <div className="ex-banner">
        Precomputed from the paper's model & calibration (European variant,
        30k-path jump-diffusion MC + Brownian-bridge KO correction). Anchor: KO
        probability {(atSpot(KO[0], 78) * 100).toFixed(1)}% at baseline vs the
        paper's European engine {(PAPER.koEU * 100).toFixed(1)}%. American
        early exercise not modeled — the paper's American KO rate{' '}
        {(PAPER.koAM * 100).toFixed(1)}% is lower by exercise pre-emption.
      </div>

      <div className="ex-grid">
        <div className="ex-panel">
          <h3>Position</h3>
          <label>
            <span className="ex-plabel">WTI spot S₁</span>
            <input type="range" min={S_GRID[0]} max={S_GRID[S_GRID.length - 1]} step={0.5} value={spot} onChange={(e) => setSpot(Number(e.target.value))} />
            <span className="ex-pval">${spot.toFixed(1)}</span>
          </label>
          <label>
            <span className="ex-plabel">Time to maturity</span>
            <input type="range" min={0} max={T_GRID.length - 1} step={1} value={T_GRID.length - 1 - ti} onChange={(e) => setTi(T_GRID.length - 1 - Number(e.target.value))} />
            <span className="ex-pval">{T_GRID[ti].toFixed(2)}y</span>
          </label>

          <div className={`ex-monitor ${risk.cls}`}>
            <div className="ex-monitor-head">
              <span className="ex-risk-icon">{risk.icon}</span> Barrier risk: {risk.label}
            </div>
            <div className="ex-monitor-body">
              KO probability <strong>{(koP * 100).toFixed(1)}%</strong>
              <div className="ex-gauge">
                <div className={`ex-gauge-fill ${risk.cls}`} style={{ width: `${koP * 100}%` }} />
              </div>
              <div className="ex-dist">
                upper barrier {U}: <strong>{distU.toFixed(1)}%</strong> away · lower {L}:{' '}
                <strong>{distL.toFixed(1)}%</strong> away
              </div>
            </div>
          </div>

          <div className="ex-contingency">
            <strong>KO contingency:</strong> if the structure knocks out, the
            hedge dies while the exposure lives. Desk rule: residual exposure
            reverts to the budget allocator (vanilla legs / collar) the same
            day — the plan exists <em>before</em> the barrier is hit.
          </div>
        </div>

        <div className="ex-main">
          <div className="ex-tiles">
            <div className="tile">
              <span className="tile-label">Value (KRW / unit)</span>
              <span className="tile-value">{v.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="tile">
              <span className="tile-label">Δ WTI (regression-grid FD)</span>
              <span className="tile-value">{dWti.toFixed(0)}</span>
            </div>
            <div className="tile">
              <span className="tile-label">Δ FX = V/S₂ (homogeneity thm)</span>
              <span className="tile-value">{dFx.toFixed(2)}</span>
            </div>
            <div className="tile">
              <span className="tile-label">c* covariance multiplier</span>
              <span className="tile-value">{C_STAR}</span>
              <span className="tile-badge">paper §c* — vs c=1 naive</span>
            </div>
          </div>

          <figure className="ex-panel">
            <h3>Value across the corridor — the barrier squeeze</h3>
            <Curve values={row.price} color="#2f6db4" spot={spot} fmt={(v) => `${(v / 1000).toFixed(0)}k`} />
            <figcaption className="ex-cap">
              Value rises with S₁ then collapses toward the upper barrier — the
              non-monotonicity that makes per-asset delta estimation break, and
              the reason the paper's covariance-aware c* ≠ 1.
            </figcaption>
          </figure>

          <figure className="ex-panel">
            <h3>Knock-out probability</h3>
            <Curve values={row.ko} color="#b3610f" spot={spot} fmt={(v) => `${(v * 100).toFixed(0)}%`} yMaxHint={1.05} />
            <figcaption className="ex-cap">
              Q-measure probability of hitting either barrier before maturity.
              Shaded edges are the dead zones; dashed line is the strike K={K}.
            </figcaption>
          </figure>
        </div>
      </div>
    </div>
  )
}
