import { useEffect, useMemo, useState } from 'react'
import {
  P1_INPUTS,
  solveBudget,
  totalCost,
  type Regime,
} from '../engine/budget'
import { Chip, useSpine } from '../state/spine'
import ParamRow from '../components/ParamRow'
import './Budget.css'

const C_WTI = '#2f6db4'
const C_FX = '#2e7d52'

const bn = (v: number) => `₩${(v / 1e9).toFixed(2)}bn`

// feasible-region map in the (w1, w2) unit square, zoomed to the action corner
const CW = 460
const CH = 300
const PAD = { top: 14, right: 16, bottom: 36, left: 46 }
const W1_MIN = 0.8

export default function Budget() {
  const [regime, setRegime] = useState<Regime>('european')
  const [B, setB] = useState<number>(P1_INPUTS.B)
  const [stressWTI, setStressWTI] = useState(113)

  const p = { regime, B, stressWTI, stressKRW: 1550 }
  const sol = useMemo(() => solveBudget(p), [regime, B, stressWTI])
  const spine = useSpine()

  useEffect(() => {
    if (sol.feasible) spine.publish({ budgetW1: sol.w1, budgetW2: sol.w2, budgetRegime: regime })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sol.w1, sol.w2, regime])

  const x = (w1: number) => PAD.left + ((w1 - W1_MIN) / (1 - W1_MIN)) * (CW - PAD.left - PAD.right)
  const y = (w2: number) => CH - PAD.bottom - (w2 / 0.2) * (CH - PAD.top - PAD.bottom)

  // budget-boundary polyline: max feasible w1 per w2 (same rule as the solver)
  const boundary = useMemo(() => {
    const pts: { w1: number; w2: number }[] = []
    for (let j = 0; j <= 80; j++) {
      const w2 = (j / 80) * 0.2
      let lo = 0
      let hi = Math.min(1, 1 - w2)
      if (totalCost(hi, w2, p) <= B) {
        pts.push({ w1: hi, w2 })
        continue
      }
      if (totalCost(lo, w2, p) > B) continue
      for (let it = 0; it < 40; it++) {
        const mid = (lo + hi) / 2
        if (totalCost(mid, w2, p) <= B) lo = mid
        else hi = mid
      }
      pts.push({ w1: lo, w2 })
    }
    return pts
  }, [regime, B, stressWTI])

  const path = boundary
    .filter((q) => q.w1 >= W1_MIN)
    .map((q, i) => `${i ? 'L' : 'M'}${x(q.w1).toFixed(1)},${y(q.w2).toFixed(1)}`)
    .join('')

  return (
    <div className="bg">
      <div className="spine-row">
        <Chip from="Materiality">
          <strong>{spine.materialCount}</strong> material risks upstream — this split covers the market-risk pair
        </Chip>
        <Chip from="Exotic Desk">
          live barrier odds <strong>{(spine.exoticKo * 100).toFixed(1)}%</strong> at spot ${spine.exoticSpot.toFixed(1)}
        </Chip>
      </div>
      <div className="bg-grid">
        {/* ── control rail ── */}
        <div className="bg-panel bg-deck">
          <h3>Program inputs</h3>
          <div className="bg-tabs">
            {(
              [
                ['european', 'European (B76 + GK)'],
                ['american', 'American KO (Shapley)'],
              ] as const
            ).map(([r, label]) => (
              <button key={r} className={regime === r ? 'bg-tab active' : 'bg-tab'} onClick={() => setRegime(r)}>
                {label}
              </button>
            ))}
          </div>
          <div className="bg-sliders" data-tour="budget-b">
            <ParamRow
              label="B budget"
              min={30e9}
              max={60e9}
              step={0.5e9}
              value={B}
              onChange={setB}
              fmt={bn}
            />
            <ParamRow
              label="S̄ stress WTI"
              min={90}
              max={130}
              step={1}
              value={stressWTI}
              onChange={setStressWTI}
              fmt={(v) => `$${v.toFixed(0)}`}
            />
          </div>
          <p className="bg-muted">
            Fixed (paper Table 1): 2.0M bbl/mo, $157.88M/mo, spot 78.94 /
            1540.64, stress FX 1550, σ₁ {regime === 'european' ? '0.395 (raw)' : '0.324 (diffusive)'},
            σ₂ 0.093, ρ 0.088.
          </p>

          <div className="bg-ko">
            <strong>Instrument rule (§7–8):</strong> stress KO odds{' '}
            {(P1_INPUTS.p_KO_stress * 100).toFixed(0)}% ≫{' '}
            {(P1_INPUTS.p_KO_breakeven * 100).toFixed(1)}% break-even — under
            stress, keep the WTI book <em>vanilla</em>. Live odds: Exotic Desk.
          </div>
        </div>

        {/* ── results ── */}
        <div className="bg-main">
        <div className="bg-tiles">
            <div className="tile">
              <span className="tile-label">WTI coverage w₁*</span>
              <span className="tile-value" style={{ color: C_WTI }}>{(sol.w1 * 100).toFixed(2)}%</span>
            </div>
            <div className="tile">
              <span className="tile-label">FX coverage w₂*</span>
              <span className="tile-value" style={{ color: C_FX }}>{(sol.w2 * 100).toFixed(2)}%</span>
            </div>
            <div className="tile">
              <span className="tile-label">Residual σ</span>
              <span className="tile-value">{sol.sigma.toFixed(4)}</span>
            </div>
            <div className="tile">
              <span className="tile-label">Total cost</span>
              <span className="tile-value">{bn(sol.cost)}</span>
              <span className={sol.budgetBinding ? 'tile-badge binding' : 'tile-badge'}>
                {sol.budgetBinding ? 'budget binding' : 'budget slack'}
              </span>
            </div>
          </div>

        <div className="bg-mid">
        <figure className="bg-panel bg-plot">
            <h3>Feasible corner &amp; the optimum</h3>
            <svg viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label="Feasible region and optimum">
              {[0.85, 0.9, 0.95, 1.0].map((v) => (
                <g key={v}>
                  <line x1={x(v)} y1={PAD.top} x2={x(v)} y2={CH - PAD.bottom} stroke="var(--line)" strokeWidth={1} />
                  <text x={x(v)} y={CH - PAD.bottom + 16} textAnchor="middle" className="tick">{(v * 100).toFixed(0)}%</text>
                </g>
              ))}
              {[0, 0.05, 0.1, 0.15, 0.2].map((v) => (
                <g key={v}>
                  <line x1={PAD.left} y1={y(v)} x2={CW - PAD.right} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
                  <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className="tick">{(v * 100).toFixed(0)}%</text>
                </g>
              ))}
              <text x={(PAD.left + CW - PAD.right) / 2} y={CH - 4} textAnchor="middle" className="axis-title">WTI coverage w₁ →</text>
              {/* allocation line w1 + w2 = 1 */}
              <line x1={x(1)} y1={y(0)} x2={x(0.8)} y2={y(0.2)} stroke="var(--muted)" strokeWidth={1} strokeDasharray="4 4" />
              <text x={x(0.9) + 4} y={y(0.105)} className="marker-label">w₁+w₂=1</text>
              {/* cost boundary */}
              <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.5} />
              {/* optimum */}
              {sol.feasible && (
                <circle cx={x(sol.w1)} cy={y(sol.w2)} r={6} fill="var(--accent)" stroke="var(--panel)" strokeWidth={2} />
              )}
            </svg>
            <figcaption className="bg-muted">
              Red curve: total-cost boundary C = B. Dashed: allocation envelope.
              The optimum (dot) sits at the vertex — constraint-pinned, which is
              why a 10% volatility mis-estimate moves what the allocation{' '}
              <em>delivers</em>, not what it <em>is</em> (paper §6.5).
            </figcaption>
        </figure>

        <div className="bg-panel">
            <h3>The split</h3>
            {(
              [
                { name: 'WTI leg', w: sol.w1, c: C_WTI },
                { name: 'FX leg', w: sol.w2, c: C_FX },
              ] as const
            ).map((leg) => (
              <div key={leg.name} className="bg-row">
                <span className="bg-name">{leg.name}</span>
                <div className="bg-track">
                  <div className="bg-fill" style={{ width: `${leg.w * 100}%`, background: leg.c }} />
                </div>
                <span className="bg-num">{(leg.w * 100).toFixed(1)}%</span>
              </div>
            ))}
            <p className="bg-muted">
              The asymmetry is structural, not budgetary: σ₁²/σ₂² ≈{' '}
              {((regime === 'european' ? P1_INPUTS.sigma1EU : P1_INPUTS.sigma1AM) ** 2 / P1_INPUTS.sigma2 ** 2).toFixed(0)}
              × and ρ ≈ 0.09 mean the minimum-variance split leaves the FX leg
              almost entirely open even with the budget deleted (paper §6.2).
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
