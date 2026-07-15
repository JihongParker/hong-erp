import { useEffect, useMemo, useState } from 'react'
import surface from '../data/exotic_surface.json'
import { useSpine } from '../state/spine'
import { useErp } from '../state/erp'
import { MARKET, clamp } from '../state/market'
import MarketChip from '../components/MarketChip'
import { crrDoubleKO, koConvergence } from '../engine/lattice'
import './ExoticDesk.css'

// Precomputed from the paper's own model & calibration (see meta in the JSON;
// generator: modeling/python/02_delta/export_erp_surface.py). Anchor: KO prob
// 0.4349 at baseline vs the paper's European engine 0.4369.
const S_GRID = surface.sGrid as number[]
const T_GRID = surface.tGrid as number[]
const PRICE = surface.price as number[][]
const DELTA = surface.deltaWTI as number[][]
const KO = surface.koProb as number[][]
const META = surface.meta as {
  calibration: { U: number; L: number; K: number; S2_0: number; sigma1: number; lambda: number; thetaJ: number; deltaJ: number; rUS: number }
}
const { U, L, K, S2_0, sigma1, lambda, thetaJ, deltaJ, rUS } = META.calibration

// paper constant (Park_quanto): covariance-aware FX multiplier
const C_STAR = -0.548

// textbook-foil vols: the lattice can only take one number. σ_diff is the bare
// diffusion vol a desk would read off; σ_total also folds in the jump variance
// λ(θ_J²+δ_J²) — but a GBM lattice fed σ_total still can't reproduce the jump's
// discrete gaps, the quanto correlation, or the barrier continuity correction.
const SIG_DIFF = sigma1
const SIG_TOT = Math.sqrt(sigma1 * sigma1 + lambda * (thetaJ * thetaJ + deltaJ * deltaJ))
const PAPER_KO_BASE = 0.435 // anchor: jump-diffusion quanto MC at S₀=K, T=0.833y

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

// ── textbook lattice foil: CRR double-KO vs the paper's jump-diffusion quanto MC
const LW = 560
const LH = 200
const LPAD = { top: 14, right: 92, bottom: 32, left: 46 }
const CONV_NS = [15, 25, 40, 60, 85, 115, 150, 190, 235, 285, 340]

function LatticeFoil({ spot, paperKo, baseT }: { spot: number; paperKo: number; baseT: number }) {
  const [nSteps, setNSteps] = useState(80)
  const [useTotal, setUseTotal] = useState(false)
  const sigma = useTotal ? SIG_TOT : SIG_DIFF
  const base = { K, U, L, T: baseT, r: rUS }

  // live lattice at the desk's current spot
  const live = useMemo(() => crrDoubleKO({ ...base, S0: spot, sigma, N: nSteps }).koProb, [spot, sigma, nSteps]) // eslint-disable-line react-hooks/exhaustive-deps

  // convergence curves at S₀ = K (baseline), both vols — computed once
  const conv = useMemo(() => ({
    diff: koConvergence({ ...base, S0: K, sigma: SIG_DIFF }, CONV_NS),
    tot: koConvergence({ ...base, S0: K, sigma: SIG_TOT }, CONV_NS),
  }), []) // eslint-disable-line react-hooks/exhaustive-deps

  const yMax = 0.6
  const xN = (n: number) => LPAD.left + ((n - CONV_NS[0]) / (CONV_NS[CONV_NS.length - 1] - CONV_NS[0])) * (LW - LPAD.left - LPAD.right)
  const yK = (v: number) => LH - LPAD.bottom - (v / yMax) * (LH - LPAD.top - LPAD.bottom)
  const path = (pts: { N: number; koProb: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${xN(p.N).toFixed(1)},${yK(p.koProb).toFixed(1)}`).join('')

  const gap = ((live - paperKo) * 100)

  return (
    <figure className="ex-panel ex-foil">
      <h3>Textbook lattice — the model-risk foil <span className="ex-foil-tag">model risk</span></h3>
      <p className="ex-foil-sub">
        A one-factor CRR binomial for the same double-KO under plain GBM — the standard
        desk tool. No jumps, no quanto correlation, no barrier continuity correction.
        Watch it disagree with the paper's engine.
      </p>

      <div className="ex-foil-ctrl">
        <label>
          <span className="ex-plabel">Lattice steps N</span>
          <input type="range" min={10} max={340} step={2} value={nSteps} onChange={(e) => setNSteps(Number(e.target.value))} />
          <span className="ex-pval">{nSteps}</span>
        </label>
        <div className="ex-foil-toggle">
          <button className={!useTotal ? 'active' : ''} onClick={() => setUseTotal(false)}>σ diffusive {SIG_DIFF.toFixed(3)}</button>
          <button className={useTotal ? 'active' : ''} onClick={() => setUseTotal(true)}>σ + jump var {SIG_TOT.toFixed(3)}</button>
        </div>
      </div>

      <div className="ex-foil-tiles">
        <div className="tile">
          <span className="tile-label">Lattice KO @ ${spot.toFixed(0)}</span>
          <span className="tile-value">{(live * 100).toFixed(1)}%</span>
        </div>
        <div className="tile">
          <span className="tile-label">Paper MC KO @ ${spot.toFixed(0)}</span>
          <span className="tile-value">{(paperKo * 100).toFixed(1)}%</span>
        </div>
        <div className="tile">
          <span className="tile-label">Lattice − paper</span>
          <span className="tile-value" style={{ color: Math.abs(gap) > 5 ? '#b3610f' : 'var(--text)' }}>{gap >= 0 ? '+' : ''}{gap.toFixed(1)} pp</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${LW} ${LH}`} role="img" aria-label="Knock-out probability vs lattice steps">
        {[0.2, 0.4, 0.6].map((g) => (
          <g key={g}>
            <line x1={LPAD.left} y1={yK(g)} x2={LW - LPAD.right} y2={yK(g)} stroke="var(--line)" strokeWidth={1} />
            <text x={LPAD.left - 6} y={yK(g) + 4} textAnchor="end" className="tick">{(g * 100).toFixed(0)}%</text>
          </g>
        ))}
        {[50, 150, 250, 340].map((n) => (
          <text key={n} x={xN(n)} y={LH - LPAD.bottom + 14} textAnchor="middle" className="tick">{n}</text>
        ))}
        <text x={(LPAD.left + LW - LPAD.right) / 2} y={LH - 2} textAnchor="middle" className="axis-title">lattice steps N →</text>

        {/* paper MC reference at baseline */}
        <line x1={LPAD.left} y1={yK(PAPER_KO_BASE)} x2={LW - LPAD.right} y2={yK(PAPER_KO_BASE)} stroke="#2f6db4" strokeWidth={1.5} strokeDasharray="6 4" />
        <text x={LPAD.left + 6} y={yK(PAPER_KO_BASE) - 6} className="series-label" fill="#2f6db4">paper MC {(PAPER_KO_BASE * 100).toFixed(0)}%</text>

        {/* CRR convergence, both vols — oscillation is the point */}
        <path d={path(conv.diff)} fill="none" stroke="#b3610f" strokeWidth={2} />
        <path d={path(conv.tot)} fill="none" stroke="#7a5195" strokeWidth={2} />
        <text x={LW - LPAD.right + 6} y={yK(conv.diff[conv.diff.length - 1].koProb) + 4} className="series-label" fill="#b3610f">σ diff</text>
        <text x={LW - LPAD.right + 6} y={yK(conv.tot[conv.tot.length - 1].koProb) - 4} className="series-label" fill="#7a5195">σ+jump</text>

        {/* current N marker */}
        <line x1={xN(Math.min(Math.max(nSteps, CONV_NS[0]), CONV_NS[CONV_NS.length - 1]))} y1={LPAD.top} x2={xN(Math.min(Math.max(nSteps, CONV_NS[0]), CONV_NS[CONV_NS.length - 1]))} y2={LH - LPAD.bottom} stroke="var(--muted)" strokeWidth={1} opacity={0.4} />
      </svg>

      <ul className="ex-foil-why">
        <li><strong>Blind to the jump.</strong> At the bare diffusion vol the lattice converges near {(conv.diff[conv.diff.length - 1].koProb * 100).toFixed(0)}% — it misses the paper's {(PAPER_KO_BASE * 100).toFixed(0)}% because the jump variance λ(θ_J²+δ_J²) isn't in it. Pumping σ to fold jump variance in fluke-matches the odds but is still the wrong process.</li>
        <li><strong>Won't sit still.</strong> The KO estimate oscillates with N: the barriers straddle lattice nodes (Boyle–Lau), so the effective barrier jitters and the number never cleanly converges.</li>
        <li><strong>One factor only.</strong> There is no FX leg here — so the paper's quanto delta Δ_FX = V/S₂ and covariance multiplier c* = {C_STAR} simply do not exist. Hedge off this and the correlation exposure stays wide open.</li>
      </ul>
    </figure>
  )
}

export default function ExoticDesk() {
  const [spot, setSpot] = useState(() => clamp(MARKET.wti.value, S_GRID[0], S_GRID[S_GRID.length - 1]))
  const [ti, setTi] = useState(0)

  const row = useMemo(
    () => ({ price: PRICE[ti], delta: DELTA[ti], ko: KO[ti] }),
    [ti],
  )
  const v = atSpot(row.price, spot)
  // homogeneity thm (paper: V linear in S2): re-express the surface — priced
  // at the paper's S2_0 — at today's FRED USD/KRW without re-simulation
  const fxScale = MARKET.usdkrw.value / S2_0
  const vLive = v * fxScale
  const dWti = atSpot(row.delta, spot)
  const koP = atSpot(row.ko, spot)
  const dFx = v / S2_0 // homogeneity theorem: structural FX delta = V/S2
  const spine = useSpine()
  const { state: erp, dispatch } = useErp()
  const [bookDiv, setBookDiv] = useState(erp.divisions[0].id)
  const [bookNot, setBookNot] = useState('0.25')
  const [booked, setBooked] = useState<string | null>(null)

  const bookQuanto = () => {
    const n = Number(bookNot)
    if (!n || n <= 0) return
    dispatch({
      type: 'bookTrade',
      trade: {
        division: bookDiv,
        instrument: 'Double-KO quanto',
        terms: `K $${K} · KO ${L}/${U} · ${T_GRID[ti].toFixed(2)}y`,
        notional: `${n.toFixed(2)}M bbl`,
        by: 'Treasury desk',
        designation: 'CFH-A',
      },
    })
    setBooked(`Booked — ${n.toFixed(2)}M bbl quanto for ${erp.divisions.find((d) => d.id === bookDiv)?.name}. Barrier odds flow to Accounting.`)
    setTimeout(() => setBooked(null), 4000)
  }

  useEffect(() => {
    spine.publish({ exoticKo: koP, exoticSpot: spot })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [koP, spot])
  const risk = koRisk(koP)
  const distU = ((U - spot) / spot) * 100
  const distL = ((spot - L) / spot) * 100

  return (
    <div className="ex">
      <div className="market-row"><MarketChip /></div>
      <div className="ex-grid">
        <div className="ex-tiles">
            <div className="tile">
              <span className="tile-label">Value (KRW / unit)</span>
              <span className="tile-value">{vLive.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              <span className="tile-badge">at live ₩{MARKET.usdkrw.value.toLocaleString()} — homogeneity rescale</span>
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

        <div className="ins-panel ins-book">
          <h3>Book this structure</h3>
          <div className="ins-bookrow">
            <label className="ins-binline">
              Division
              <select value={bookDiv} onChange={(e) => setBookDiv(e.target.value)}>
                {erp.divisions.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
            <label className="ins-binline">
              Notional (M bbl)
              <input type="text" inputMode="decimal" value={bookNot} onChange={(e) => setBookNot(e.target.value)} />
            </label>
            <button className="ins-bookbtn" onClick={bookQuanto}>Book quanto</button>
            {booked && <span className="ins-bookflash">✓ {booked}</span>}
          </div>
        </div>

        <div className="ex-panel ex-deck">
          <h3>Position &amp; barrier monitor</h3>
          <label data-tour="spot">
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

        <div className="ex-charts">
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

        <LatticeFoil spot={spot} paperKo={koP} baseT={T_GRID[0]} />
      </div>
    </div>
  )
}
