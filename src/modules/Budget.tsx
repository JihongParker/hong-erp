import { useEffect, useMemo, useState } from 'react'
import {
  P1_INPUTS,
  solveBudget,
  survivalSwitch,
  totalCost,
  unconstrainedSplit,
  type Regime,
  stripLedger,
  mixedProgram,
  P1_STRIP,
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
  const [rho, setRho] = usePersistentState<number>('budget.rho', P1_INPUTS.rho)

  const p = { regime, B, stressWTI, stressKRW: 1550, rho }
  const sol = useMemo(() => solveBudget(p), [regime, B, stressWTI, rho])
  // how far the budget-free minimum-variance split travels with the correlation
  // input — the sensitivity the volatility-inflation check of §6.5 cannot show
  const freeSplit = useMemo(() => unconstrainedSplit(rho), [rho])
  const rhoStressed = Math.abs(rho - P1_INPUTS.rho) > 1e-9
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
  }, [regime, B, stressWTI, rho])

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
            <ParamRow
              label={t('ρ correlation')}
              min={-0.9}
              max={0.9}
              step={0.01}
              value={rho}
              onChange={setRho}
              fmt={(v) => v.toFixed(3)}
            />
          </div>
          {rhoStressed && (
            <p className="bg-muted bg-rho-warn">
              {lang === 'ko' ? (
                <>
                  <strong>상관계수 스트레스 적용 중</strong> (평상시 추정치 ρ =
                  {' '}{P1_INPUTS.rho.toFixed(4)}). 논문 §6.5의 불변성은 두 변동성을
                  동시에 부풀렸을 때 분산비가 보존되기 때문이며, ρ가 움직이면
                  성립하지 않습니다. 예산을 없앤 최소분산 배분은 지금 ρ에서{' '}
                  {(freeSplit.w1 * 100).toFixed(1)} / {(freeSplit.w2 * 100).toFixed(1)}
                  이고 (박스 제약 0≤w≤1 적용 전 값이므로 범위를 벗어날 수 있습니다),
                  평상시 ρ에서는{' '}
                  {(unconstrainedSplit(P1_INPUTS.rho).w1 * 100).toFixed(1)} /{' '}
                  {(unconstrainedSplit(P1_INPUTS.rho).w2 * 100).toFixed(1)} 입니다.
                </>
              ) : (
                <>
                  <strong>Correlation stressed</strong> (calm-sample estimate ρ ={' '}
                  {P1_INPUTS.rho.toFixed(4)}). The §6.5 invariance holds because
                  inflating both volatilities preserves the variance ratio; it does
                  not survive a move in ρ. The budget-free minimum-variance split is{' '}
                  {(freeSplit.w1 * 100).toFixed(1)} / {(freeSplit.w2 * 100).toFixed(1)}{' '}
                  at this ρ (before the box constraint 0≤w≤1, so it can leave the
                  range), against{' '}
                  {(unconstrainedSplit(P1_INPUTS.rho).w1 * 100).toFixed(1)} /{' '}
                  {(unconstrainedSplit(P1_INPUTS.rho).w2 * 100).toFixed(1)} at the
                  calm-sample value.
                </>
              )}
            </p>
          )}
          <p className="bg-muted">
            {lang === 'ko' ? (
              <>
                고정값 (논문 Table 1): 2.0M bbl/월, $157.88M/월, 스팟 78.94 / 1540.64,
                스트레스 FX 1550, σ₁ {regime === 'european' ? '0.395 (원값)' : '0.324 (확산)'},
                σ₂ 0.093. ρ는 위 슬라이더로 스트레스할 수 있습니다 (평상시 추정치 0.088).
              </>
            ) : (
              <>
                Fixed (paper Table 1): 2.0M bbl/mo, $157.88M/mo, spot 78.94 /
                1540.64, stress FX 1550, σ₁ {regime === 'european' ? '0.395 (raw)' : '0.324 (diffusive)'},
                σ₂ 0.093. ρ is stressable above (calm-sample estimate 0.088).
              </>
            )}
          </p>

          <div className="bg-ko">
            {lang === 'ko' ? (
              <>
                <strong>상품 규칙 (§7–8):</strong> 보유계약의 스트레스 도달 조건부
                소멸률 {(P1_INPUTS.p_KO_held * 100).toFixed(0)}% ≫ 손익분기{' '}
                {(P1_INPUTS.p_KO_breakeven * 100).toFixed(1)}% — 스트레스 상황에서는
                WTI 장부를 <em>바닐라</em>로 유지합니다. 아래 스위치 패널에서 직접
                움직여 보세요.
              </>
            ) : (
              <>
                <strong>Instrument rule (§7–8):</strong> held-contract stress
                mortality {(P1_INPUTS.p_KO_held * 100).toFixed(0)}% ≫{' '}
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
                  빨간 곡선은 총비용 경계 C = B, 점선은 배분 포락선입니다. 이 패널은
                  논문의 분산·시나리오 <em>벤치마크</em> 원장을 라이브로 재현합니다.
                  논문의 헤드라인은 스트립+CVaR 결과입니다: 단일 포락선에서는 100/0
                  코너(권한 여유), 별도 북에서는 ₩540bn 권한을 정확히 소진하며 w₂
                  83.6%. 분산 벤치마크의 내부해는 ρ가 움직이면 함께 움직입니다.
                </>
              ) : (
                <>
                  Red curve: total-cost boundary C = B. Dashed: allocation envelope.
                  This panel reproduces the paper's variance/scenario
                  <em> benchmark</em> ledger live. The paper's headline is the strip
                  + CVaR result: the 100/0 corner in one envelope (authority slack),
                  and the ₩540bn authority spent exactly at w₂ 83.6% with separate
                  books. The variance benchmark's interior solution moves with ρ.
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
                  이 비대칭은 예산 제약이 아니라 위험 목표에서 나옵니다. σ₁²/σ₂² ≈{' '}
                  {((regime === 'european' ? P1_INPUTS.sigma1EU : P1_INPUTS.sigma1AM) ** 2 / P1_INPUTS.sigma2 ** 2).toFixed(0)}
                  ×에 ρ = {rho.toFixed(3)}이므로, 예산 제약을 없애도 최소분산 배분은 FX
                  레그를 {(Math.min(1, Math.max(0, freeSplit.w2)) * 100).toFixed(0)}%만
                  덮습니다 (논문 §6.2). 다만 ρ는 평상시 표본에서
                  추정한 값이고, 이 배분은 그 추정치에 크게 의존합니다. 스트레스 국면의
                  상관관계 붕괴에서는 같은 닫힌 해가 다른 배분을 돌려줍니다 — 위
                  슬라이더로 직접 확인해 보십시오 (논문 §한계).
                </>
              ) : (
                <>
                  The asymmetry follows from the risk objective rather than from
                  the budget: σ₁²/σ₂² ≈{' '}
                  {((regime === 'european' ? P1_INPUTS.sigma1EU : P1_INPUTS.sigma1AM) ** 2 / P1_INPUTS.sigma2 ** 2).toFixed(0)}
                  × and ρ = {rho.toFixed(3)} leave the minimum-variance split covering
                  only {(Math.min(1, Math.max(0, freeSplit.w2)) * 100).toFixed(0)}% of
                  the FX leg even with the budget deleted (paper §6.2). But ρ is estimated on a calm sample and the split depends
                  heavily on it: under the correlation breakdown of a stressed regime
                  the same closed form returns a different answer. Move the slider
                  above to price that case (paper §Limitations).
                </>
              )}
            </p>
          </div>
        </div>
        </div>
      </div>

      <StripPanel />
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
  const mix = useMemo(() => mixedProgram(p), [p])
  const bnv = (v: number) => `₩${(v / 1e9).toFixed(1)}bn`
  const regimeLabel =
    mix.regime === 'floor'
      ? lang === 'ko' ? '바닥 구간 · 전량 KO, 예산 여유' : 'floor · all-KO, budget slack'
      : mix.regime === 'pinned'
        ? lang === 'ko' ? '예산 고정 구간 · 전량 KO, 예산 소진' : 'budget-pinned · all-KO, budget binding'
        : lang === 'ko' ? '바닐라 구간 · 전량 바닐라' : 'vanilla · all-vanilla book'

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
            담보로 잡은 대출입니다. 할인의 가치는 {bnv(sw.discountValue)}로 고정인데, 보호가 죽는
            비용은 소멸 확률에 비례해 자랍니다. 두 선이 만나는 손익분기{' '}
            {(sw.pBar * 100).toFixed(1)}%를 넘는 순간, 최적화기는 장부를 전량
            바닐라로 옮깁니다.
          </>
        ) : (
          <>
            The knock-out discount is not free money — it is a loan against the
            probability that protection is <em>dead when needed</em>. The discount
            is worth a fixed {bnv(sw.discountValue)}; the cost of dead protection grows with
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
            <button onClick={() => setP(P1_INPUTS.p_KO_held)}>
              {lang === 'ko' ? `보유계약 실측 ${(P1_INPUTS.p_KO_held * 100).toFixed(1)}%` : `held-contract ${(P1_INPUTS.p_KO_held * 100).toFixed(1)}%`}
            </button>
            <button onClick={() => setP(P1_INPUTS.p_KO_stress)}>
              {lang === 'ko' ? `신규계약 스트레스 ${(P1_INPUTS.p_KO_stress * 100).toFixed(1)}%` : `fresh-at-stress ${(P1_INPUTS.p_KO_stress * 100).toFixed(1)}%`}
            </button>
          </div>
          <div className={`bg-mix bg-mix-${mix.regime}`}>
            <div className="bg-mix-head">
              <span className="bg-mix-tag">{lang === 'ko' ? '혼합 프로그램 (§8)' : 'mixed program (§8)'}</span>
              <strong>{regimeLabel}</strong>
            </div>
            <dl className="bg-mix-kv">
              <dt>{lang === 'ko' ? '장부 (w₁ / w₂)' : 'book (w₁ / w₂)'}</dt>
              <dd>{(mix.w1 * 100).toFixed(2)}% / {(mix.w2 * 100).toFixed(2)}%</dd>
              <dt>σ_res</dt>
              <dd>{mix.sigma.toFixed(5)} <span className="bg-mix-sub">({lang === 'ko' ? '바닥' : 'floor'} {mix.sigmaFloor.toFixed(5)})</span></dd>
              <dt>{lang === 'ko' ? '생존조정 원장' : 'survival-adjusted ledger'}</dt>
              <dd>{bnv(mix.ledger)} <span className="bg-mix-sub">/ ₩45.0bn</span></dd>
              <dt>{lang === 'ko' ? '순수 KO 장부' : 'pure-KO book'}</dt>
              <dd>{bnv(mix.pureKoLedger)} <span className="bg-mix-sub">{mix.p > mix.pStar ? (lang === 'ko' ? '권한 초과' : 'over authority') : ''}</span></dd>
            </dl>
            <p className="bg-mix-note">
              {lang === 'ko'
                ? `p* = ${(mix.pStar * 100).toFixed(1)}% 넘으면 어떤 배분도 순수 KO 장부를 권한 안에 못 넣고, p† = ${(mix.pDagger * 100).toFixed(1)}% 넘으면 커버 자체가 손해입니다.`
                : `Past p* = ${(mix.pStar * 100).toFixed(1)}% no allocation keeps the pure-KO ledger inside the authority; past p† = ${(mix.pDagger * 100).toFixed(1)}% coverage stops paying for itself.`}
            </p>
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
            {lang === 'ko' ? `낙아웃 할인 ${bnv(sw.discountValue)}` : `KO discount ${bnv(sw.discountValue)}`}
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
            2008년 KIKO가 정확히 이 그림의 오른쪽 끝이었습니다. 논문이 원장에 넣는
            수치는 보유계약이 스트레스 구간에 닿았을 때의 소멸률{' '}
            {(P1_INPUTS.p_KO_held * 100).toFixed(1)}%로, 손익분기의{' '}
            {(P1_INPUTS.p_KO_held / P1_INPUTS.p_KO_breakeven).toFixed(0)}배입니다.
            스트레스 현물에서 새로 체결하는 계약은{' '}
            {(P1_INPUTS.p_KO_stress * 100).toFixed(1)}%까지 올라갑니다. 어느 쪽이든
            이 모형은 위기 상황에서 낙아웃을 거들떠보지 않고 바닐라로 대피합니다.
            실시간 소멸 확률은 퀀토 데스크의 배리어 모니터에서 옵니다.
          </>
        ) : (
          <>
            The 2008 KIKO book lived at the far right of this chart. The figure the
            paper's ledger takes is the held contract's mortality once its path
            reaches the stress band, {(P1_INPUTS.p_KO_held * 100).toFixed(1)}%,{' '}
            {(P1_INPUTS.p_KO_held / P1_INPUTS.p_KO_breakeven).toFixed(0)}× the
            break-even; a contract struck fresh at the stress spot dies with
            probability {(P1_INPUTS.p_KO_stress * 100).toFixed(1)}%. Either way the
            program refuses the knock-out under stress and walks to vanilla. Live
            mortality comes from the quanto desk's barrier monitor.
          </>
        )}
      </p>
    </div>
  )
}

// ── P1 §2–5: the maturity-matched strip, priced live slice by slice ──────────
const STW = 660
const STH = 200
const STP = { top: 22, right: 16, bottom: 30, left: 52 }

function StripPanel() {
  const t = useT()
  const [lang] = useLang()
  const L = useMemo(() => stripLedger(), [])
  const bnv = (v: number) => `₩${(v / 1e9).toFixed(1)}bn`
  const maxSlice = Math.max(...L.slices.map((q) => q.wtiPremium))
  const uniformSlice = L.uniformK1 / 12
  const yMax = Math.max(maxSlice, uniformSlice) * 1.08
  const colW = (STW - STP.left - STP.right) / 12
  const y = (v: number) => STH - STP.bottom - (v / yMax) * (STH - STP.top - STP.bottom)
  const k2 = P1_STRIP.cvar95.kappa2

  return (
    <div className="bg-panel bg-strip">
      <h3>
        {t('Maturity-matched strip — the annual ledger')}{' '}
        <span className="bg-switch-tag">{lang === 'ko' ? '논문 §2–5' : 'paper §2–5'}</span>
      </h3>
      <p className="bg-muted bg-switch-lede">
        {lang === 'ko' ? (
          <>
            월별 조달분마다 그 달 결제일에 만기가 오는 옵션을 붙이면 열두 조각의
            스트립이 됩니다. 조각별 프리미엄은 그 만기의 Black-76·Garman–Kohlhagen
            닫힌 해로 여기서 직접 계산합니다. 열두 장을 모두 10개월물로 사는 것보다
            WTI 레그에서만 연 {bnv(L.matchingSaving)}({(L.matchingSavingPct * 100).toFixed(1)}%)이
            절약됩니다.
          </>
        ) : (
          <>
            Match each month's procurement with an option expiring at that month's
            settlement and the program becomes a twelve-slice strip. Every slice
            premium is priced here in closed form (Black-76, Garman–Kohlhagen) at its
            own tenor. Against twelve uniform ten-month contracts the matching alone
            saves {bnv(L.matchingSaving)} ({(L.matchingSavingPct * 100).toFixed(1)}%) a
            year on the WTI leg.
          </>
        )}
      </p>
      <div className="bg-tiles">
        <div className="tile">
          <span className="tile-label">{t('WTI strip K₁ˢ')}</span>
          <span className="tile-value" style={{ color: C_WTI }}>{bnv(L.K1S)}</span>
        </div>
        <div className="tile">
          <span className="tile-label">{t('FX strip K₂ˢ')}</span>
          <span className="tile-value" style={{ color: C_FX }}>{bnv(L.K2S)}</span>
        </div>
        <div className="tile">
          <span className="tile-label">{t('Matching saving / yr')}</span>
          <span className="tile-value">{bnv(L.matchingSaving)}</span>
        </div>
        <div className="tile">
          <span className="tile-label">{t('Annual authority')}</span>
          <span className="tile-value">{bnv(L.B_year)}</span>
          <span className="tile-badge">12 × ₩45bn</span>
        </div>
      </div>
      <div className="bg-strip-grid">
        <svg viewBox={`0 0 ${STW} ${STH}`} role="img" aria-label={t('Per-slice full-coverage premiums')}>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line x1={STP.left} x2={STW - STP.right} y1={y(yMax * f)} y2={y(yMax * f)} stroke="var(--line)" strokeWidth={1} />
              <text x={STP.left - 6} y={y(yMax * f) + 4} className="bg-sw-lbl" fill="var(--muted)" textAnchor="end">
                {(yMax * f / 1e9).toFixed(0)}
              </text>
            </g>
          ))}
          {L.slices.map((q) => {
            const x0 = STP.left + (q.m - 1) * colW
            return (
              <g key={q.m}>
                <rect x={x0 + 4} width={colW * 0.42} y={y(q.wtiPremium)} height={y(0) - y(q.wtiPremium)} fill={C_WTI} opacity={0.9} rx={2} />
                <rect x={x0 + 4 + colW * 0.46} width={colW * 0.42} y={y(q.fxPremium)} height={y(0) - y(q.fxPremium)} fill={C_FX} opacity={0.9} rx={2} />
                <text x={x0 + colW / 2} y={STH - STP.bottom + 14} className="bg-sw-lbl" fill="var(--muted)" textAnchor="middle">
                  {q.m}m
                </text>
              </g>
            )
          })}
          <line x1={STP.left} x2={STW - STP.right} y1={y(uniformSlice)} y2={y(uniformSlice)} stroke="#b3610f" strokeWidth={1.2} strokeDasharray="5 3" />
          <text x={STP.left + 6} y={y(uniformSlice) - 5} className="bg-sw-lbl" fill="#b3610f" textAnchor="start">
            {lang === 'ko' ? '10개월물 균일 계약' : 'uniform 0.833y contract'} {bnv(uniformSlice)}
          </text>
          <text x={STP.left - 6} y={9} className="bg-sw-lbl" fill="var(--muted)" textAnchor="end">KRW bn</text>
        </svg>
        <div className="bg-verdict">
          <div className="bg-verdict-head">
            <span className="bg-verdict-label">{lang === 'ko' ? 'CVaR₉₅ 프로그램 (논문 동결값, 20만 경로)' : 'CVaR₉₅ program (paper-frozen, 200k paths)'}</span>
          </div>
          <dl className="bg-mix-kv bg-mix-kv--wide">
            <dt>{lang === 'ko' ? '단일 포락선 (κ=1)' : 'one envelope (κ=1)'}</dt>
            <dd>w = (1, 0) · CVaR {bnv(P1_STRIP.cvar95.kappa1.cvar)} · {lang === 'ko' ? '권한 여유' : 'authority slack'}</dd>
            <dt>{lang === 'ko' ? '별도 북 (κ=2)' : 'separate books (κ=2)'}</dt>
            <dd>w = (1, {k2.w2.toFixed(4)}) · CVaR {bnv(k2.cvar)} · {lang === 'ko' ? '권한 정확 소진' : 'authority spent exactly'}</dd>
            <dt>{lang === 'ko' ? '권한 섀도가격' : 'shadow price of authority'}</dt>
            <dd>{bnv(P1_STRIP.cvar95.shadowPerBn)} / ₩1bn</dd>
            <dt>{lang === 'ko' ? 'FX 0.5y 캡 판정' : 'FX 0.5y cap verdict'}</dt>
            <dd>{lang === 'ko' ? '동일만기 유지' : 'co-term'} · {bnv(P1_STRIP.fxMaturity.capSavingMax)} {lang === 'ko' ? '절감' : 'saving'} vs {bnv(P1_STRIP.fxMaturity.capTailCost)} {lang === 'ko' ? '꼬리비용' : 'tail cost'}</dd>
          </dl>
          <p className="bg-mix-note">
            {lang === 'ko'
              ? '꼬리 목적함수는 20만 경로 은행 위에서 풀리므로 브라우저에서 재계산하지 않고 논문 결과를 그대로 고정합니다. 위 스트립 프리미엄은 그 프로그램의 가격 입력이며 여기서 라이브로 재현됩니다.'
              : "The tail objective is solved on the 200k-path bank, so it is pinned from the paper rather than recomputed here. The strip premiums above are that program's price inputs and are reproduced live."}
          </p>
        </div>
      </div>
    </div>
  )
}
