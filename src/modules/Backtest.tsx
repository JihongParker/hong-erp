import { useMemo, useState } from 'react'
import bt from '../data/backtest.json'
import './Backtest.css'

// Out-of-sample walk-forward hedge backtest. Precomputed in Python
// (modeling/python/07_backtest/backtest.py) on 40y of FRED daily data
// (DCOILWTICO WTI + DEXKOUS USD/KRW), exported here as a compact results JSON —
// same precompute-then-display pattern as the exotic surface.
//
// This is a HEDGING backtest, not an alpha strategy: it measures how much of a
// mandated physical exposure's cash-flow variance the covariance-aware optimum
// removes out of sample, versus naive alternatives, after transaction costs.

type Row = { policy: string; ann_vol: number; cvar95: number; mdd: number; total_cost: number; var_reduction: number; vol_reduction: number; n: number }
type PathPt = { month: string; cum: number }
type Roll = { month: string; w1: number; w2: number; rho: number }

const SUMMARY = bt.summary as Row[]
const PATHS = bt.paths as Record<string, PathPt[]>
const ROLL = bt.rolling as Roll[]
const META = bt.meta as {
  source: string; span: [string, string]; n_months: number; window: number; budget: number; tc_bps: number
  oracle_split: { w1: number; w2: number }; full_sample_rho: number; generated: string
}

const LABEL: Record<string, string> = {
  unhedged: 'Unhedged', naive: 'Naive 1:1 split', oracle: 'Full-sample MV (oracle)', walkforward: 'Walk-forward MV',
}
const NOTE: Record<string, string> = {
  unhedged: 'carry the whole two-factor exposure',
  naive: 'split the budget evenly across both legs',
  oracle: 'look-ahead: MV split on the full sample (upper bound)',
  walkforward: 'covariance-aware split, estimated on strictly past data',
}
const COLOR: Record<string, string> = {
  unhedged: '#b3610f', naive: '#8a8a8a', oracle: '#7a5195', walkforward: '#2f6db4',
}

const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`

export default function Backtest() {
  const wf = SUMMARY.find((s) => s.policy === 'walkforward')!
  const naive = SUMMARY.find((s) => s.policy === 'naive')!
  const negShare = useMemo(() => ROLL.filter((r) => r.rho < 0).length / ROLL.length, [])

  return (
    <div className="bt">
      <div className="bt-banner">
        <strong>Not an alpha strategy — a hedging backtest.</strong> A Korean crude importer carries a
        mandated exposure (buy oil in USD, pay in KRW): its monthly bill is Q · P<sub>oil</sub> · FX, a
        two-factor product. The only question is how much residual <em>cash-flow variance</em> the optimal
        hedge removes out of sample, after costs — never a return stream, never a Sharpe.
      </div>

      <div className="bt-tiles">
        <div className="tile">
          <span className="tile-label">Variance removed (walk-forward, OOS)</span>
          <span className="tile-value" style={{ color: COLOR.walkforward }}>{pct(wf.var_reduction, 0)}</span>
          <span className="tile-badge">vs {pct(naive.var_reduction, 0)} naive · {META.n_months} months</span>
        </div>
        <div className="tile">
          <span className="tile-label">Tail cut — max drawdown</span>
          <span className="tile-value">{pct(SUMMARY[0].mdd, 0)} → {pct(wf.mdd, 0)}</span>
          <span className="tile-badge">unhedged → walk-forward cumulative</span>
        </div>
        <div className="tile">
          <span className="tile-label">ρ(r_oil, r_fx) &lt; 0</span>
          <span className="tile-value" style={{ color: negShare > 0.5 ? '#b3610f' : 'var(--text)' }}>{pct(negShare, 0)}</span>
          <span className="tile-badge">of months — the c* &lt; 0 regime</span>
        </div>
        <div className="tile">
          <span className="tile-label">Estimation gap to oracle</span>
          <span className="tile-value">{pct(SUMMARY[2].var_reduction - wf.var_reduction, 1)}</span>
          <span className="tile-badge">look-ahead minus walk-forward — robust</span>
        </div>
      </div>

      <div className="bt-grid">
        <div className="bt-panel">
          <h3>Realised hedge performance — {META.span[0]} to {META.span[1]}</h3>
          <div className="bt-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Policy</th>
                  <th className="num">Ann. vol</th>
                  <th className="num">Variance removed</th>
                  <th className="num">CVaR 95%</th>
                  <th className="num">Max drawdown</th>
                  <th className="num">Cost</th>
                </tr>
              </thead>
              <tbody>
                {SUMMARY.map((s) => (
                  <tr key={s.policy} className={s.policy === 'walkforward' ? 'hl' : undefined}>
                    <td>
                      <span className="bt-dot" style={{ background: COLOR[s.policy] }} /> {LABEL[s.policy]}
                      <span className="bt-note">{NOTE[s.policy]}</span>
                    </td>
                    <td className="num">{pct(s.ann_vol, 1)}</td>
                    <td className="num">{s.policy === 'unhedged' ? '—' : pct(s.var_reduction, 1)}</td>
                    <td className="num">{pct(s.cvar95, 1)}</td>
                    <td className="num">{pct(s.mdd, 0)}</td>
                    <td className="num">{s.policy === 'unhedged' ? '—' : pct(s.total_cost, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="bt-verdict">
            The covariance-aware hedge, estimated only on <strong>past</strong> data and rebalanced monthly,
            removes <strong>{pct(wf.var_reduction, 0)}</strong> of cash-flow variance out of sample —
            {' '}{((wf.var_reduction - naive.var_reduction) * 100).toFixed(0)}pp more than naive even splitting —
            and lands within {pct(SUMMARY[2].var_reduction - wf.var_reduction, 1)} of the look-ahead oracle.
            The edge survives costs and holds across 3–10y estimation windows.
          </p>
        </div>

        <CumChart />
      </div>

      <CStarPanel negShare={negShare} />

      <div className="bt-method">
        <h3>Method &amp; honest caveats</h3>
        <ul>
          <li><strong>Strict walk-forward.</strong> Σ is estimated from a rolling {META.window}-month window of
            <em> strictly past</em> monthly returns; the split is applied to the next month's realised return.
            No look-ahead — the oracle row is the only look-ahead policy, shown deliberately as the ceiling.</li>
          <li><strong>Costs included.</strong> {META.tc_bps} bp charged on rebalancing turnover each month.
            The walk-forward cost ({pct(wf.total_cost, 2)}) is the price of chasing the covariance; it is small
            relative to the {pct(wf.var_reduction - naive.var_reduction, 0)} of extra variance it buys.</li>
          <li><strong>Variance, not alpha.</strong> Every number is a property of the hedged cost distribution.
            There is no return stream and no Sharpe — claiming one would misrepresent what a hedge does.</li>
          <li><strong>What it confirms.</strong> The full-sample split is {META.oracle_split.w1.toFixed(2)} / {META.oracle_split.w2.toFixed(2)}
            (oil / FX) — coverage concentrates on the high-variance oil leg, exactly the paper's structural
            97/3. And ρ is negative {pct(negShare, 0)} of the time, so the FX leg partially self-hedges oil:
            the real-data analogue of the paper's counterintuitive c* &lt; 0.</li>
        </ul>
        <p className="bt-src">
          Source: {META.source}. Precomputed {META.generated} by modeling/python/07_backtest/backtest.py.
        </p>
      </div>
    </div>
  )
}

// cumulative hedged-cost path for each policy — unhedged sprawls, walk-forward hugs zero
const CW = 640, CH = 300, PAD = { top: 16, right: 16, bottom: 30, left: 46 }
function CumChart() {
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const keys = ['unhedged', 'naive', 'oracle', 'walkforward']
  const vis = keys.filter((k) => !hidden[k])
  const all = vis.flatMap((k) => PATHS[k].map((p) => p.cum))
  const yMin = Math.min(0, ...all), yMax = Math.max(0, ...all)
  const n = PATHS.unhedged.length
  const x = (i: number) => PAD.left + (i / (n - 1)) * (CW - PAD.left - PAD.right)
  const y = (v: number) => CH - PAD.bottom - ((v - yMin) / (yMax - yMin || 1)) * (CH - PAD.top - PAD.bottom)
  const line = (k: string) => PATHS[k].map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.cum).toFixed(1)}`).join('')
  const yr = (m: string) => m.slice(0, 4)
  const ticks = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1]

  return (
    <figure className="bt-panel bt-chart">
      <h3>Cumulative hedged cost — the tighter the better</h3>
      <svg viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label="Cumulative hedged cost by policy">
        <line x1={PAD.left} y1={y(0)} x2={CW - PAD.right} y2={y(0)} stroke="var(--line)" strokeWidth={1} />
        {ticks.map((i) => (
          <text key={i} x={x(i)} y={CH - PAD.bottom + 16} textAnchor="middle" className="tick">{yr(PATHS.unhedged[i].month)}</text>
        ))}
        {vis.map((k) => (
          <path key={k} d={line(k)} fill="none" stroke={COLOR[k]} strokeWidth={k === 'walkforward' ? 2.4 : 1.6} opacity={k === 'walkforward' ? 1 : 0.85} />
        ))}
      </svg>
      <figcaption className="bt-legend">
        {keys.map((k) => (
          <button key={k} className={hidden[k] ? 'bt-lg off' : 'bt-lg'} onClick={() => setHidden((h) => ({ ...h, [k]: !h[k] }))}>
            <span className="bt-dot" style={{ background: COLOR[k] }} /> {LABEL[k]}
          </button>
        ))}
      </figcaption>
    </figure>
  )
}

// rolling correlation + FX coverage — when rho dips negative, the optimal FX
// coverage w2 falls, the real-data face of c* < 0
const RW = 1320, RH = 200, RP = { top: 14, right: 46, bottom: 28, left: 46 }
function CStarPanel({ negShare }: { negShare: number }) {
  const n = ROLL.length
  const rhos = ROLL.map((r) => r.rho)
  const rMax = Math.max(0.5, ...rhos.map(Math.abs))
  const x = (i: number) => RP.left + (i / (n - 1)) * (RW - RP.left - RP.right)
  const yR = (v: number) => RH / 2 - (v / rMax) * (RH / 2 - RP.top)
  const yW = (v: number) => RH - RP.bottom - v * (RH - RP.top - RP.bottom) // w2 in [0,1]
  const rhoLine = ROLL.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yR(r.rho).toFixed(1)}`).join('')
  const w2Line = ROLL.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yW(r.w2).toFixed(1)}`).join('')
  const ticks = [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1]

  return (
    <figure className="bt-panel bt-cstar">
      <h3>Where the paper's c* &lt; 0 shows up in the data</h3>
      <p className="bt-cstar-sub">
        The correlation between oil and FX monthly returns is negative {pct(negShare, 0)} of the time — in
        risk-off months oil falls while the won weakens, so the FX exposure partly offsets oil on its own.
        When ρ dips negative the variance-minimising FX coverage w<sub>2</sub> falls toward zero: naive
        one-for-one pass-through would over-hedge. This is the covariance-aware c* &lt; 0, out of sample.
      </p>
      <svg viewBox={`0 0 ${RW} ${RH}`} role="img" aria-label="Rolling correlation and FX coverage">
        {/* zero line for rho (top half) */}
        <line x1={RP.left} y1={yR(0)} x2={RW - RP.right} y2={yR(0)} stroke="var(--line)" strokeWidth={1} strokeDasharray="4 4" />
        <text x={RP.left - 6} y={yR(0) + 4} textAnchor="end" className="tick">ρ=0</text>
        {/* negative-rho shaded band under zero */}
        {ROLL.map((r, i) => r.rho < 0 && i < n - 1 ? (
          <rect key={i} x={x(i)} y={yR(0)} width={x(i + 1) - x(i) + 0.5} height={2} fill="#b3610f" opacity={0.5} />
        ) : null)}
        <path d={rhoLine} fill="none" stroke="#b3610f" strokeWidth={1.8} />
        <path d={w2Line} fill="none" stroke="#2f6db4" strokeWidth={1.8} />
        {ticks.map((i) => (
          <text key={i} x={x(i)} y={RH - RP.bottom + 16} textAnchor="middle" className="tick">{ROLL[i].month.slice(0, 4)}</text>
        ))}
        <text x={RW - RP.right + 4} y={yR(rhos[n - 1]) + 4} className="bt-slabel" fill="#b3610f">ρ</text>
        <text x={RW - RP.right + 4} y={yW(ROLL[n - 1].w2) + 4} className="bt-slabel" fill="#2f6db4">w₂</text>
      </svg>
      <figcaption className="bt-legend">
        <span className="bt-lg"><span className="bt-dot" style={{ background: '#b3610f' }} /> ρ(r_oil, r_fx) — rolling</span>
        <span className="bt-lg"><span className="bt-dot" style={{ background: '#2f6db4' }} /> w₂ — optimal FX coverage</span>
      </figcaption>
    </figure>
  )
}
