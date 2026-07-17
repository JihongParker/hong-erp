import { useEffect, useMemo } from 'react'
import {
  P1_INPUTS,
  solveBudget,
  totalCost,
  type Regime,
} from '../engine/budget'
import { Chip, useSpine } from '../state/spine'
import { usePersistentState } from '../state/persist'
import { usePulse } from '../components/usePulse'
import ParamRow from '../components/ParamRow'
import { useT, useLang } from '../i18n'
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
  const t = useT()
  const [lang] = useLang()
  const [regime, setRegime] = usePersistentState<Regime>('budget.regime', 'european')
  const [B, setB] = usePersistentState<number>('budget.B', P1_INPUTS.B)
  const [stressWTI, setStressWTI] = usePersistentState('budget.stressWTI', 113)

  const p = { regime, B, stressWTI, stressKRW: 1550 }
  const sol = useMemo(() => solveBudget(p), [regime, B, stressWTI])
  const spine = useSpine()
  // settle-only pulses for the four result tiles
  const pulseW1 = usePulse(sol.w1)
  const pulseW2 = usePulse(sol.w2)
  const pulseSig = usePulse(sol.sigma)
  const pulseCost = usePulse(sol.cost)

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
          {lang === 'ko' ? (
            <>중대 리스크 <strong>{spine.materialCount}</strong>개 확정 — 그중 시장 리스크(유가·환율)를 이 예산으로 커버합니다</>
          ) : (
            <><strong>{spine.materialCount}</strong> material risks upstream — this split covers the market-risk pair</>
          )}
        </Chip>
        <Chip from="Exotic Desk">
          {lang === 'ko' ? (
            <>실시간 배리어 확률 <strong>{(spine.exoticKo * 100).toFixed(1)}%</strong> · 현물 ${spine.exoticSpot.toFixed(1)}</>
          ) : (
            <>live barrier odds <strong>{(spine.exoticKo * 100).toFixed(1)}%</strong> at spot ${spine.exoticSpot.toFixed(1)}</>
          )}
        </Chip>
      </div>
      <div className="bg-grid">
        {/* ── control rail ── */}
        <div className="bg-panel bg-deck">
          <h3>{t('Program inputs')}</h3>
          <div className="bg-tabs">
            {(
              [
                ['european', 'European (B76 + GK)'],
                ['american', 'American KO (Shapley)'],
              ] as const
            ).map(([r, label]) => (
              <button key={r} className={regime === r ? 'bg-tab active' : 'bg-tab'} onClick={() => setRegime(r)}>
                {t(label)}
              </button>
            ))}
          </div>
          <div className="bg-sliders" data-tour="budget-b">
            <ParamRow
              label={t('B budget')}
              min={43e9}
              max={60e9}
              step={0.5e9}
              value={B}
              onChange={setB}
              fmt={bn}
            />
            <ParamRow
              label={t('S̄ stress WTI')}
              min={90}
              max={130}
              step={1}
              value={stressWTI}
              onChange={setStressWTI}
              fmt={(v) => `$${v.toFixed(0)}`}
            />
          </div>
          <p className="bg-muted">
            {lang === 'ko' ? (
              <>
                고정값 (논문 Table 1): 2.0M bbl/월, $157.88M/월, 스팟 78.94 / 1540.64,
                스트레스 FX 1550, σ₁ {regime === 'european' ? '0.395 (원값)' : '0.324 (확산)'},
                σ₂ 0.093, ρ 0.088.
              </>
            ) : (
              <>
                Fixed (paper Table 1): 2.0M bbl/mo, $157.88M/mo, spot 78.94 /
                1540.64, stress FX 1550, σ₁ {regime === 'european' ? '0.395 (raw)' : '0.324 (diffusive)'},
                σ₂ 0.093, ρ 0.088.
              </>
            )}
          </p>

          <div className="bg-ko">
            {lang === 'ko' ? (
              <>
                <strong>상품 규칙 (§7–8):</strong> 스트레스 KO 확률{' '}
                {(P1_INPUTS.p_KO_stress * 100).toFixed(0)}% ≫ 손익분기{' '}
                {(P1_INPUTS.p_KO_breakeven * 100).toFixed(1)}% — 스트레스 상황에서는
                WTI 장부를 <em>바닐라</em>로 유지합니다. 실시간 확률은 이그저틱
                데스크에서 볼 수 있습니다.
              </>
            ) : (
              <>
                <strong>Instrument rule (§7–8):</strong> stress KO odds{' '}
                {(P1_INPUTS.p_KO_stress * 100).toFixed(0)}% ≫{' '}
                {(P1_INPUTS.p_KO_breakeven * 100).toFixed(1)}% break-even — under
                stress, keep the WTI book <em>vanilla</em>. Live odds: Exotic Desk.
              </>
            )}
          </div>
        </div>

        {/* ── results ── */}
        <div className="bg-main">
        <div className="bg-tiles">
            <div className="tile">
              <span className="tile-label">{t('WTI coverage w₁*')}</span>
              <span className={pulseW1 ? 'tile-value pulse' : 'tile-value'} style={{ color: C_WTI }}>{(sol.w1 * 100).toFixed(2)}%</span>
            </div>
            <div className="tile">
              <span className="tile-label">{t('FX coverage w₂*')}</span>
              <span className={pulseW2 ? 'tile-value pulse' : 'tile-value'} style={{ color: C_FX }}>{(sol.w2 * 100).toFixed(2)}%</span>
            </div>
            <div className="tile">
              <span className="tile-label">{t('Residual σ')}</span>
              <span className={pulseSig ? 'tile-value pulse' : 'tile-value'}>{sol.sigma.toFixed(4)}</span>
            </div>
            <div className="tile">
              <span className="tile-label">{t('Total cost')}</span>
              <span className={pulseCost ? 'tile-value pulse' : 'tile-value'}>{bn(sol.cost)}</span>
              <span className={sol.budgetBinding ? 'tile-badge binding' : 'tile-badge'}>
                {sol.budgetBinding ? t('budget binding') : t('budget slack')}
              </span>
            </div>
          </div>

        <div className="bg-mid">
        <figure className="bg-panel bg-plot">
            <h3>{t('Feasible corner & the optimum')}</h3>
            <svg viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label={t('Feasible region and optimum')}>
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
              {lang === 'ko' ? (
                <>
                  빨간 곡선은 총비용 경계 C = B, 점선은 배분 포락선입니다. 최적해(점)는
                  제약에 붙들려 꼭짓점에 고정되어 있습니다. 그래서 변동성을 10% 잘못
                  재더라도 배분이 <em>가져다주는 결과</em>가 달라질 뿐, 배분{' '}
                  <em>자체</em>는 그대로입니다 (논문 §6.5).
                </>
              ) : (
                <>
                  Red curve: total-cost boundary C = B. Dashed: allocation envelope.
                  The optimum (dot) sits at the vertex, constraint-pinned, which is
                  why a 10% volatility mis-estimate moves what the allocation{' '}
                  <em>delivers</em>, not what it <em>is</em> (paper §6.5).
                </>
              )}
            </figcaption>
        </figure>

        <div className="bg-panel">
            <h3>{t('The split')}</h3>
            {(
              [
                { name: 'WTI leg', w: sol.w1, c: C_WTI },
                { name: 'FX leg', w: sol.w2, c: C_FX },
              ] as const
            ).map((leg) => (
              <div key={leg.name} className="bg-row">
                <span className="bg-name">{t(leg.name)}</span>
                <div className="bg-track">
                  <div className="bg-fill" style={{ width: `${leg.w * 100}%`, background: leg.c }} />
                </div>
                <span className="bg-num">{(leg.w * 100).toFixed(1)}%</span>
              </div>
            ))}
            <p className="bg-muted">
              {lang === 'ko' ? (
                <>
                  이 비대칭은 예산이 아니라 구조에서 옵니다. σ₁²/σ₂² ≈{' '}
                  {((regime === 'european' ? P1_INPUTS.sigma1EU : P1_INPUTS.sigma1AM) ** 2 / P1_INPUTS.sigma2 ** 2).toFixed(0)}
                  ×에 ρ ≈ 0.09이므로, 예산 제약을 없애도 최소분산 배분은 FX 레그를
                  거의 통째로 열어 둡니다 (논문 §6.2).
                </>
              ) : (
                <>
                  The asymmetry is structural, not budgetary: σ₁²/σ₂² ≈{' '}
                  {((regime === 'european' ? P1_INPUTS.sigma1EU : P1_INPUTS.sigma1AM) ** 2 / P1_INPUTS.sigma2 ** 2).toFixed(0)}
                  × and ρ ≈ 0.09 mean the minimum-variance split leaves the FX leg
                  almost entirely open even with the budget deleted (paper §6.2).
                </>
              )}
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
