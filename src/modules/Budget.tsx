import { useEffect, useMemo, useState } from 'react'
import {
  P1_INPUTS,
  solveBudget,
  survivalSwitch,
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
                WTI 장부를 <em>바닐라</em>로 유지합니다. 아래 스위치 패널에서 직접
                움직여 보세요.
              </>
            ) : (
              <>
                <strong>Instrument rule (§7–8):</strong> stress KO odds{' '}
                {(P1_INPUTS.p_KO_stress * 100).toFixed(0)}% ≫{' '}
                {(P1_INPUTS.p_KO_breakeven * 100).toFixed(1)}% break-even — under
                stress, keep the WTI book <em>vanilla</em>. Try it on the switch
                panel below.
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

      <SurvivalSwitchPanel liveKo={spine.exoticKo} />
    </div>
  )
}

// ── §7–8: the survival haircut, playable — the KO discount vs the expected
// cost of protection that is dead when needed, and the bang-bang switch ──
const SW = 660
const SH = 240
const SP = { top: 16, right: 138, bottom: 34, left: 56 }

function SurvivalSwitchPanel({ liveKo }: { liveKo: number }) {
  const t = useT()
  const [lang] = useLang()
  // loads at the desk's live odds; the slider then explores freely
  const [p, setP] = useState(() => Math.min(0.95, Math.max(0, liveKo)))
  const sw = survivalSwitch(p)
  const bnv = (v: number) => `₩${(v / 1e9).toFixed(1)}bn`

  const yMax = sw.fullBookStressLoss
  const x = (q: number) => SP.left + q * (SW - SP.left - SP.right)
  const y = (v: number) => SH - SP.bottom - (v / yMax) * (SH - SP.top - SP.bottom)

  return (
    <div className="bg-panel bg-switch">
      <h3>
        {t('Survival haircut — the instrument switch')}{' '}
        <span className="bg-switch-tag">{lang === 'ko' ? '논문 §7–8' : 'paper §7–8'}</span>
      </h3>
      <p className="bg-muted bg-switch-lede">
        {lang === 'ko' ? (
          <>
            낙아웃 할인은 공짜가 아니라 <em>필요할 때 보호가 죽어 있을 확률</em>을
            담보로 잡은 대출입니다. 할인의 가치는 ₩6.5bn으로 고정인데, 보호가 죽는
            비용은 소멸 확률에 비례해 자랍니다. 두 선이 만나는 손익분기{' '}
            {(sw.pBar * 100).toFixed(1)}%를 넘는 순간, 최적화기는 장부를 전량
            바닐라로 옮깁니다.
          </>
        ) : (
          <>
            The knock-out discount is not free money — it is a loan against the
            probability that protection is <em>dead when needed</em>. The discount
            is worth a fixed ₩6.5bn; the cost of dead protection grows with
            mortality. Past the {(sw.pBar * 100).toFixed(1)}% break-even, the
            optimizer walks the book to all-vanilla.
          </>
        )}
      </p>

      <div className="bg-switch-grid">
        <div className="bg-switch-rail">
          <ParamRow
            label={t('p mortality when needed')}
            min={0}
            max={0.95}
            step={0.005}
            value={p}
            onChange={setP}
            fmt={(v) => `${(v * 100).toFixed(1)}%`}
          />
          <div className="bg-switch-presets">
            <button onClick={() => setP(Math.min(0.95, Math.max(0, liveKo)))}>
              {lang === 'ko' ? `데스크 실시간 ${(liveKo * 100).toFixed(1)}%` : `desk live ${(liveKo * 100).toFixed(1)}%`}
            </button>
            <button onClick={() => setP(P1_INPUTS.p_KO_stress)}>
              {lang === 'ko' ? `스트레스 실측 ${(P1_INPUTS.p_KO_stress * 100).toFixed(1)}%` : `stress-measured ${(P1_INPUTS.p_KO_stress * 100).toFixed(1)}%`}
            </button>
          </div>

          <div className={sw.allVanilla ? 'bg-verdict vanilla' : 'bg-verdict ko'}>
            <span className="bg-verdict-head">
              {lang === 'ko' ? 'WTI 장부 구성' : 'WTI book'}
            </span>
            <div className="bg-verdict-bar">
              <div
                className="bg-verdict-ko"
                style={{ width: `${sw.koShare * 100}%` }}
              />
            </div>
            <span className="bg-verdict-label">
              {sw.allVanilla
                ? lang === 'ko'
                  ? `전량 바닐라 — 예상 소멸 비용 ${bnv(sw.expectedMortalityCost)}가 할인 ${bnv(sw.discountValue)}의 ${sw.marginRatio.toFixed(1)}배`
                  : `all-vanilla — expected mortality cost ${bnv(sw.expectedMortalityCost)} is ${sw.marginRatio.toFixed(1)}× the ${bnv(sw.discountValue)} discount`
                : lang === 'ko'
                  ? `낙아웃 유지 — 예상 소멸 비용 ${bnv(sw.expectedMortalityCost)} < 할인 ${bnv(sw.discountValue)}`
                  : `keep the knock-out — expected mortality cost ${bnv(sw.expectedMortalityCost)} < the ${bnv(sw.discountValue)} discount`}
            </span>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${SW} ${SH}`}
          role="img"
          aria-label={t('Discount vs expected cost of dead protection')}
        >
          {/* region past the break-even: vanilla dominates */}
          <rect
            x={x(sw.pBar)}
            y={SP.top}
            width={x(1) - x(sw.pBar)}
            height={SH - SP.top - SP.bottom}
            fill="#b3610f"
            opacity={0.06}
          />
          {[0.25, 0.5, 0.75, 1].map((g) => (
            <g key={g}>
              <line x1={SP.left} y1={y(g * yMax)} x2={SW - SP.right} y2={y(g * yMax)} stroke="var(--line)" strokeWidth={1} />
              <text x={SP.left - 6} y={y(g * yMax) + 4} textAnchor="end" className="tick">
                {(g * yMax / 1e9).toFixed(0)}
              </text>
            </g>
          ))}
          {[0, 0.25, 0.5, 0.75].map((q) => (
            <text key={q} x={x(q)} y={SH - SP.bottom + 14} textAnchor="middle" className="tick">
              {(q * 100).toFixed(0)}%
            </text>
          ))}
          <text x={(SP.left + SW - SP.right) / 2} y={SH - 4} textAnchor="middle" className="axis-title">
            {lang === 'ko' ? '소멸 확률 p →' : 'mortality when needed p →'}
          </text>
          <text x={12} y={SP.top + 8} className="axis-title" transform={`rotate(-90 12 ${SP.top + 8})`} textAnchor="end">
            ₩bn
          </text>

          {/* the discount: flat */}
          <line x1={SP.left} y1={y(sw.discountValue)} x2={SW - SP.right} y2={y(sw.discountValue)} stroke={C_FX} strokeWidth={2} />
          <text x={SW - SP.right + 6} y={y(sw.discountValue) + 4} className="bg-sw-lbl" fill={C_FX}>
            {lang === 'ko' ? '낙아웃 할인 ₩6.5bn' : 'KO discount ₩6.5bn'}
          </text>
          {/* expected mortality cost: p × full-book stress loss */}
          <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(yMax)} stroke="#b3610f" strokeWidth={2} />
          <text x={SW - SP.right + 6} y={y(yMax * 0.86)} className="bg-sw-lbl" fill="#b3610f">
            {lang === 'ko' ? '예상 소멸 비용' : 'expected mortality cost'}
          </text>
          {/* break-even */}
          <line x1={x(sw.pBar)} y1={SP.top} x2={x(sw.pBar)} y2={SH - SP.bottom} stroke="var(--muted)" strokeWidth={1} strokeDasharray="4 3" />
          <text x={x(sw.pBar) + 4} y={SP.top + 10} className="bg-sw-lbl" fill="var(--muted)">
            p̄ = {(sw.pBar * 100).toFixed(1)}%
          </text>
          {/* current p marker on the diagonal */}
          <line x1={x(p)} y1={SP.top} x2={x(p)} y2={SH - SP.bottom} stroke="var(--accent)" strokeWidth={1} opacity={0.5} />
          <circle cx={x(p)} cy={y(sw.expectedMortalityCost)} r={5.5} fill={sw.allVanilla ? '#b3610f' : C_FX} stroke="var(--panel)" strokeWidth={2} />
        </svg>
      </div>

      <p className="bg-muted bg-switch-note">
        {lang === 'ko' ? (
          <>
            2008년 KIKO가 정확히 이 그림의 오른쪽 끝이었습니다. 스트레스 상태에서
            실측한 소멸 확률 {(P1_INPUTS.p_KO_stress * 100).toFixed(1)}%는 손익분기의{' '}
            {(P1_INPUTS.p_KO_stress / P1_INPUTS.p_KO_breakeven).toFixed(0)}배 —
            그래서 이 모형은 위기 상황에서 낙아웃을 거들떠보지 않고 바닐라로
            대피합니다. 실시간 소멸 확률은 퀀토 데스크의 배리어 모니터에서 옵니다.
          </>
        ) : (
          <>
            The 2008 KIKO book lived at the far right of this chart: mortality
            measured from the stress state is {(P1_INPUTS.p_KO_stress * 100).toFixed(1)}%,{' '}
            {(P1_INPUTS.p_KO_stress / P1_INPUTS.p_KO_breakeven).toFixed(0)}× the
            break-even — which is why this program refuses the knock-out under
            stress and walks to vanilla. Live mortality comes from the quanto
            desk's barrier monitor.
          </>
        )}
      </p>
    </div>
  )
}
