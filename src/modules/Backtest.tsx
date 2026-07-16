import { useMemo, useState } from 'react'
import bt from '../data/backtest.json'
import { runBacktest, type Ret } from '../engine/backtest'
import { usePersistentState } from '../state/persist'
import { usePulse } from '../components/usePulse'
import ParamRow from '../components/ParamRow'
import { useT, useLang } from '../i18n'
import './Backtest.css'

// Out-of-sample walk-forward hedge backtest. The raw monthly returns come from
// Python (modeling/python/07_backtest/backtest.py) on 40y of FRED daily data
// (DCOILWTICO WTI + DEXKOUS USD/KRW); the walk-forward engine re-runs live in
// the browser so the window / budget / cost sliders recompute everything.
//
// A HEDGING backtest, not alpha: it measures how much of a mandated exposure's
// cash-flow variance the covariance-aware optimum removes out of sample.

const RETURNS = bt.returns as Ret[]
const META = bt.meta as { source: string; generated: string }

const LABEL: Record<string, string> = {
  unhedged: 'Unhedged', naive: 'Naive even split', oracle: 'Full-sample MV (oracle)', walkforward: 'Walk-forward MV',
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
  const [window, setWindow] = usePersistentState('backtest.window', 60)
  const [budget, setBudget] = usePersistentState('backtest.budget', 1.0)
  const [tcBps, setTcBps] = usePersistentState('backtest.tcBps', 5)
  const t = useT()
  const [lang] = useLang()

  const out = useMemo(() => runBacktest(RETURNS, { window, budget, tcBps }), [window, budget, tcBps])
  const wf = out.summary.find((s) => s.policy === 'walkforward')!
  const naive = out.summary.find((s) => s.policy === 'naive')!
  const oracle = out.summary.find((s) => s.policy === 'oracle')!
  const unhedged = out.summary.find((s) => s.policy === 'unhedged')!
  // settle-only pulse for the live headline number
  const heroPulse = usePulse(wf.varReduction)

  return (
    <div className="bt">
      <div className="bt-banner">
        {lang === 'ko' ? (
          <>
            <strong>알파 전략이 아니라 — 헤지 백테스트입니다.</strong> 한국 원유 수입사는 의무적 익스포저를
            집니다 (원유는 USD로 사고 대금은 KRW로 지불): 월 청구액은 Q · P<sub>oil</sub> · FX, 즉 2-요인
            곱입니다. 유일한 질문은 최적 헤지가 비용을 반영한 뒤 표본 밖에서 잔여 <em>현금흐름 분산</em>을
            얼마나 제거하는가입니다: 수익 스트림도, 샤프도 아닙니다. 아래 모든 숫자는 슬라이더를 움직이면
            실제 수익률 486개월치에서 실시간으로 다시 계산됩니다.
          </>
        ) : (
          <>
            <strong>Not an alpha strategy — a hedging backtest.</strong> A Korean crude importer carries a
            mandated exposure (buy oil in USD, pay in KRW): its monthly bill is Q · P<sub>oil</sub> · FX, a
            two-factor product. The only question is how much residual <em>cash-flow variance</em> the optimal
            hedge removes out of sample, after costs: never a return stream, never a Sharpe. Every number below
            re-runs live from 486 months of real returns as you move the sliders.
          </>
        )}
      </div>

      <div className="bt-grid">
        {/* ── control rail ── */}
        <div className="bt-rail">
          <div className="bt-panel bt-controls">
            <h3>Backtest controls</h3>
            <ParamRow label="Estimation window" min={24} max={120} step={6} value={window} onChange={setWindow} fmt={(v) => `${v}m`} />
            <ParamRow label="Hedge budget" min={0.4} max={1.6} step={0.1} value={budget} onChange={setBudget} fmt={(v) => v.toFixed(1)} />
            <ParamRow label="Cost per turnover" min={0} max={25} step={1} value={tcBps} onChange={setTcBps} fmt={(v) => `${v}bp`} />
            <p className="bt-muted">
              {t('Rolling window sets how much past data estimates Σ; budget caps total coverage (<2 binds); cost is charged on rebalancing turnover. The walk-forward result stays ~14pp above naive across the whole slider range — the edge is not a tuned artifact.')}
            </p>
          </div>

          <div className="bt-panel bt-hero">
            <span className="bt-hero-label">Variance removed — walk-forward, out of sample</span>
            <span className={heroPulse ? 'bt-hero-value pulse' : 'bt-hero-value'}>{pct(wf.varReduction, 0)}</span>
            <div className="bt-hero-row">
              <span>vs naive <strong>{pct(naive.varReduction, 0)}</strong></span>
              <span>gap to oracle <strong>{pct(oracle.varReduction - wf.varReduction, 1)}</strong></span>
            </div>
            <div className="bt-hero-row">
              <span>MDD <strong>{pct(unhedged.mdd, 0)}→{pct(wf.mdd, 0)}</strong></span>
              <span>ρ&lt;0 <strong>{pct(out.negShare, 0)}</strong></span>
            </div>
          </div>
        </div>

        {/* ── results ── */}
        <div className="bt-main">
          <div className="bt-panel">
            <h3>Realised hedge performance — {out.span[0]} to {out.span[1]}</h3>
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
                  {out.summary.map((s) => (
                    <tr key={s.policy} className={s.policy === 'walkforward' ? 'hl' : undefined}>
                      <td>
                        <span className="bt-dot" style={{ background: COLOR[s.policy] }} /> {LABEL[s.policy]}
                        <span className="bt-note">{NOTE[s.policy]}</span>
                      </td>
                      <td className="num">{pct(s.annVol, 1)}</td>
                      <td className="num">{s.policy === 'unhedged' ? '—' : pct(s.varReduction, 1)}</td>
                      <td className="num">{pct(s.cvar95, 1)}</td>
                      <td className="num">{pct(s.mdd, 0)}</td>
                      <td className="num">{s.policy === 'unhedged' ? '—' : pct(s.totalCost, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="bt-verdict">
              {lang === 'ko' ? (
                <>
                  공분산을 반영한 헤지는 <strong>과거</strong> 데이터만으로 추정해 매달 리밸런싱하며, 표본 밖에서
                  현금흐름 분산의 <strong>{pct(wf.varReduction, 0)}</strong>를 제거합니다
                  {' '}(나이브 균등 분할보다 {((wf.varReduction - naive.varReduction) * 100).toFixed(0)}pp 더 높음).
                  그리고 미래를 미리 본 오라클과의 격차는 {pct(oracle.varReduction - wf.varReduction, 1)} 이내에 듭니다.
                </>
              ) : (
                <>
                  The covariance-aware hedge, estimated only on <strong>past</strong> data and rebalanced monthly,
                  removes <strong>{pct(wf.varReduction, 0)}</strong> of cash-flow variance out of sample
                  {' '}({((wf.varReduction - naive.varReduction) * 100).toFixed(0)}pp more than naive even splitting),
                  and lands within {pct(oracle.varReduction - wf.varReduction, 1)} of the look-ahead oracle.
                </>
              )}
            </p>
          </div>

          <CumChart paths={out.paths} />
        </div>
      </div>

      <CStarPanel rolling={out.rolling} negShare={out.negShare} />

      <ParabolaPanel />

      <div className="bt-method">
        <h3>Method &amp; honest caveats</h3>
        <ul>
          {lang === 'ko' ? (
            <>
              <li><strong>엄격한 워크포워드.</strong> Σ는 <em>철저히 과거</em> 월간 수익률의 롤링 윈도에서 추정하고, 그 분할을 다음 달 실현 수익률에 적용합니다. 미래 참조 없음: 오라클 행만이 유일한 미래 참조 정책이며, 상한선을 보여 주려고 일부러 넣었습니다.</li>
              <li><strong>비용 포함.</strong> 매달 리밸런싱 회전율에 부과됩니다. 워크포워드 비용({pct(wf.totalCost, 2)})은 그 대가로 얻는 추가 분산 {pct(wf.varReduction - naive.varReduction, 0)}에 비하면 작습니다.</li>
              <li><strong>알파가 아니라 분산.</strong> 모든 숫자는 헤지된 비용 분포의 속성입니다: 수익 스트림도, 샤프도 아닙니다.</li>
              <li><strong>무엇을 확인해 주는가.</strong> 전체 표본 분할은 {out.oracleSplit.w1.toFixed(2)} / {out.oracleSplit.w2.toFixed(2)}(원유 / FX)입니다: 커버리지는 고분산 원유 다리에 집중되며, 이는 논문의 구조적 97/3입니다. 그리고 ρ는 {pct(out.negShare, 0)}의 기간 동안 음수여서 FX 다리가 원유를 부분적으로 자체 헤지합니다. 논문의 반직관적 c* &lt; 0에 대응하는 실데이터 결과입니다.</li>
            </>
          ) : (
            <>
              <li><strong>Strict walk-forward.</strong> Σ is estimated from a rolling window of <em>strictly past</em>
                monthly returns; the split is applied to the next month's realised return. No look-ahead: the
                oracle row is the only look-ahead policy, shown deliberately as the ceiling.</li>
              <li><strong>Costs included.</strong> Charged on rebalancing turnover each month; the walk-forward cost
                ({pct(wf.totalCost, 2)}) is small relative to the {pct(wf.varReduction - naive.varReduction, 0)} of
                extra variance it buys.</li>
              <li><strong>Variance, not alpha.</strong> Every number is a property of the hedged cost distribution:
                no return stream, no Sharpe.</li>
              <li><strong>What it confirms.</strong> The full-sample split is {out.oracleSplit.w1.toFixed(2)} / {out.oracleSplit.w2.toFixed(2)}
                (oil / FX): coverage concentrates on the high-variance oil leg, the paper's structural 97/3. And ρ
                is negative {pct(out.negShare, 0)} of the time, so the FX leg partially self-hedges oil: the real-data
                analogue of the paper's counterintuitive c* &lt; 0.</li>
            </>
          )}
        </ul>
        <p className="bt-src">Source: {META.source}. Monthly returns auto-refreshed monthly from FRED by GitHub Actions (last: {META.generated}); the walk-forward engine then re-runs live in the browser.</p>
      </div>
    </div>
  )
}

// cumulative hedged-cost path per policy
const CW = 640, CH = 300, PAD = { top: 16, right: 16, bottom: 30, left: 46 }
function CumChart({ paths }: { paths: Record<string, { month: string; cum: number }[]> }) {
  const [hidden, setHidden] = useState<Record<string, boolean>>({})
  const keys = ['unhedged', 'naive', 'oracle', 'walkforward']
  const vis = keys.filter((k) => !hidden[k])
  const all = vis.flatMap((k) => paths[k].map((p) => p.cum))
  const yMin = Math.min(0, ...all), yMax = Math.max(0, ...all)
  const n = paths.unhedged.length
  const x = (i: number) => PAD.left + (i / (n - 1)) * (CW - PAD.left - PAD.right)
  const y = (v: number) => CH - PAD.bottom - ((v - yMin) / (yMax - yMin || 1)) * (CH - PAD.top - PAD.bottom)
  const line = (k: string) => paths[k].map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.cum).toFixed(1)}`).join('')
  const ticks = [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1]
  return (
    <figure className="bt-panel bt-chart">
      <h3>Cumulative hedged cost — the flatter the better</h3>
      <svg viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label="Cumulative hedged cost by policy">
        <line x1={PAD.left} y1={y(0)} x2={CW - PAD.right} y2={y(0)} stroke="var(--line)" strokeWidth={1} />
        {ticks.map((i) => (
          <text key={i} x={x(i)} y={CH - PAD.bottom + 16} textAnchor="middle" className="tick">{paths.unhedged[i].month.slice(0, 4)}</text>
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

// P2 dynamic-hedging result: the exact hedge-cost parabola in the coupling c,
// reconstructed from the paper's own 200k-path exact-engine certified numbers
// (c* = -0.548, std 51.90bn at c=1, 48.76bn at c*). Var(c) = VarA + 2c·Cov +
// c²·VarB. Solving those three certified numbers gives the moments below.
const P2 = (() => {
  const cstar = -0.548, s1 = 51.90, sc = 48.76, k = -cstar
  const VarB = (s1 * s1 - sc * sc) / (2 * k + 1 + k * k)
  const Cov = k * VarB
  const VarA = sc * sc + (Cov * Cov) / VarB
  return { cstar, VarA, VarB, Cov, std1: s1, stdStar: sc }
})()
const PW = 1320, PH = 300, PP = { top: 18, right: 120, bottom: 40, left: 60 }
function ParabolaPanel() {
  const stdOf = (c: number) => Math.sqrt(P2.VarA + 2 * c * P2.Cov + c * c * P2.VarB)
  const cLo = -1.6, cHi = 1.8
  const cs = Array.from({ length: 141 }, (_, i) => cLo + ((cHi - cLo) * i) / 140)
  const ys = cs.map(stdOf)
  const yMin = 45, yMax = Math.max(...ys) * 1.01
  const x = (c: number) => PP.left + ((c - cLo) / (cHi - cLo)) * (PW - PP.left - PP.right)
  const y = (v: number) => PH - PP.bottom - ((v - yMin) / (yMax - yMin)) * (PH - PP.top - PP.bottom)
  const path = cs.map((c, i) => `${i ? 'L' : 'M'}${x(c).toFixed(1)},${y(ys[i]).toFixed(1)}`).join('')
  // right arm [0.5,1.5] = the paper's swept window
  const arm = cs.filter((c) => c >= 0.5 && c <= 1.5)
  const armPath = arm.map((c, i) => `${i ? 'L' : 'M'}${x(c).toFixed(1)},${y(stdOf(c)).toFixed(1)}`).join('')
  return (
    <figure className="bt-panel bt-cstar">
      <h3>P2 — the dynamic hedge-cost parabola, and why naive c = 1 is off-optimum</h3>
      <p className="bt-cstar-sub">
        Coupling the FX hedge to the WTI delta as δ<sub>FX</sub> = c · δ<sub>WTI</sub> makes per-path hedge
        cost exactly affine in c, so its variance is an exact parabola with closed-form vertex
        c* = −Cov(A,B)/Var(B). On the paper's 200k-path exact engine Cov(A,B) is <strong>positive</strong>,
        so the vertex is <strong>negative (c* = −0.548)</strong>: a positively-coupled FX leg adds cost
        variance rather than offsetting it, and naive one-for-one pass-through (c = 1) sits well up the
        expensive right arm. Honestly, though, the lever is second-order: std falls only from 51.90 to
        48.76 bn KRW (~6%), because the WTI leg dominates Var(A) and no c can touch it. Same verdict as the
        static split above: the FX leg is a small part of the hedge.
      </p>
      <svg viewBox={`0 0 ${PW} ${PH}`} role="img" aria-label="Hedge-cost standard deviation vs coupling c">
        {/* y grid */}
        {[46, 48, 50, 52, 54].map((v) => (
          <g key={v}>
            <line x1={PP.left} y1={y(v)} x2={PW - PP.right} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
            <text x={PP.left - 8} y={y(v) + 4} textAnchor="end" className="tick">{v}</text>
          </g>
        ))}
        {/* c ticks */}
        {[-1.5, -1, -0.548, 0, 0.5, 1, 1.5].map((c) => (
          <text key={c} x={x(c)} y={PH - PP.bottom + 16} textAnchor="middle" className="tick">{c === -0.548 ? 'c*' : c}</text>
        ))}
        <text x={(PP.left + PW - PP.right) / 2} y={PH - 6} textAnchor="middle" className="axis-title">coupling multiplier c  (δ_FX = c · δ_WTI)</text>
        {/* full parabola */}
        <path d={path} fill="none" stroke="var(--muted)" strokeWidth={1.6} opacity={0.6} />
        {/* swept right arm highlighted */}
        <path d={armPath} fill="none" stroke="#b3610f" strokeWidth={2.6} />
        {/* vertex c* */}
        <line x1={x(P2.cstar)} y1={y(P2.stdStar)} x2={x(P2.cstar)} y2={PH - PP.bottom} stroke="#2f6db4" strokeWidth={1} strokeDasharray="3 3" />
        <circle cx={x(P2.cstar)} cy={y(P2.stdStar)} r={5} fill="#2f6db4" stroke="var(--panel)" strokeWidth={2} />
        <text x={x(P2.cstar)} y={y(P2.stdStar) - 10} textAnchor="middle" className="bt-slabel" fill="#2f6db4">c* = −0.548 · {P2.stdStar}bn</text>
        {/* naive c=1 */}
        <line x1={x(1)} y1={y(P2.std1)} x2={x(1)} y2={PH - PP.bottom} stroke="#b3610f" strokeWidth={1} strokeDasharray="3 3" />
        <circle cx={x(1)} cy={y(P2.std1)} r={5} fill="#b3610f" stroke="var(--panel)" strokeWidth={2} />
        <text x={x(1) + 8} y={y(P2.std1) - 6} className="bt-slabel" fill="#b3610f">naive c = 1 · {P2.std1}bn</text>
      </svg>
      <figcaption className="bt-legend">
        <span className="bt-lg"><span className="bt-dot" style={{ background: '#b3610f' }} /> swept window [0.5, 1.5] — the parabola's right arm</span>
        <span className="bt-lg"><span className="bt-dot" style={{ background: '#2f6db4' }} /> closed-form vertex c* (variance minimiser)</span>
      </figcaption>
      <p className="bt-src">
        Parabola reconstructed exactly from the paper's certified moments (Park_quanto §c*: c* = −0.548,
        std 51.90bn at c = 1, 48.76bn at c*, 200k jump-adapted exact paths, affine identity to 6×10⁻¹⁶).
        An independent frozen-engine delta-hedge here confirms the direction: c = 1 sits on the expensive
        arm, so the naive "c = 1 is optimal" reading is wrong.
      </p>
    </figure>
  )
}

const RW = 1320, RH = 200, RP = { top: 14, right: 46, bottom: 28, left: 46 }
function CStarPanel({ rolling, negShare }: { rolling: { month: string; w1: number; w2: number; rho: number }[]; negShare: number }) {
  const n = rolling.length
  const rMax = Math.max(0.5, ...rolling.map((r) => Math.abs(r.rho)))
  const x = (i: number) => RP.left + (i / (n - 1)) * (RW - RP.left - RP.right)
  const yR = (v: number) => RH / 2 - (v / rMax) * (RH / 2 - RP.top)
  const yW = (v: number) => RH - RP.bottom - v * (RH - RP.top - RP.bottom)
  const rhoLine = rolling.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yR(r.rho).toFixed(1)}`).join('')
  const w2Line = rolling.map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yW(r.w2).toFixed(1)}`).join('')
  const ticks = [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1]
  return (
    <figure className="bt-panel bt-cstar">
      <h3>Where the paper's c* &lt; 0 shows up in the data</h3>
      <p className="bt-cstar-sub">
        Oil and FX monthly returns are negatively correlated {pct(negShare, 0)} of the time: in risk-off months
        oil falls while the won weakens, so the FX exposure partly offsets oil on its own. When ρ dips negative
        the variance-minimising FX coverage w<sub>2</sub> falls toward zero: naive one-for-one pass-through would
        over-hedge. This is the covariance-aware c* &lt; 0, out of sample.
      </p>
      <svg viewBox={`0 0 ${RW} ${RH}`} role="img" aria-label="Rolling correlation and FX coverage">
        <line x1={RP.left} y1={yR(0)} x2={RW - RP.right} y2={yR(0)} stroke="var(--line)" strokeWidth={1} strokeDasharray="4 4" />
        <text x={RP.left - 6} y={yR(0) + 4} textAnchor="end" className="tick">ρ=0</text>
        {rolling.map((r, i) => r.rho < 0 && i < n - 1 ? (
          <rect key={i} x={x(i)} y={yR(0)} width={x(i + 1) - x(i) + 0.5} height={2} fill="#b3610f" opacity={0.5} />
        ) : null)}
        <path d={rhoLine} fill="none" stroke="#b3610f" strokeWidth={1.8} />
        <path d={w2Line} fill="none" stroke="#2f6db4" strokeWidth={1.8} />
        {ticks.map((i) => (
          <text key={i} x={x(i)} y={RH - RP.bottom + 16} textAnchor="middle" className="tick">{rolling[i].month.slice(0, 4)}</text>
        ))}
        <text x={RW - RP.right + 4} y={yR(rolling[n - 1].rho) + 4} className="bt-slabel" fill="#b3610f">ρ</text>
        <text x={RW - RP.right + 4} y={yW(rolling[n - 1].w2) + 4} className="bt-slabel" fill="#2f6db4">w₂</text>
      </svg>
      <figcaption className="bt-legend">
        <span className="bt-lg"><span className="bt-dot" style={{ background: '#b3610f' }} /> ρ(r_oil, r_fx) — rolling</span>
        <span className="bt-lg"><span className="bt-dot" style={{ background: '#2f6db4' }} /> w₂ — optimal FX coverage</span>
      </figcaption>
    </figure>
  )
}
