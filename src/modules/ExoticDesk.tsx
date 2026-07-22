import { useEffect, useMemo, useState } from 'react'
import surface from '../data/exotic_surface.json'
import { Chip, useSpine } from '../state/spine'
import { useErp } from '../state/erp'
import { usePersistentState } from '../state/persist'
import { MARKET, clamp } from '../state/market'
import MarketChip from '../components/MarketChip'
import HelpDot from '../components/HelpDot'
import { useToast } from '../components/Toast'
import { useT, useLang } from '../i18n'
import { crrDoubleKO, koConvergence, gbmDoubleKOprob } from '../engine/lattice'
import { europeanQuanto, type QuantoCalib } from '../engine/quanto'
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
  calibration: { U: number; L: number; K: number; S2_0: number; sigma1: number; lambda: number; thetaJ: number; deltaJ: number; sigma2: number; rho: number; rUS: number; rKRW: number }
}
const { U, L, K, S2_0, sigma1, lambda, thetaJ, deltaJ, sigma2, rho, rUS, rKRW } = META.calibration

// same calibration as the paper's surface — used by the European ablation engine
const CALIB: QuantoCalib = { sigma1, lambda, thetaJ, deltaJ, sigma2, rho, rUS, rKRW, S2_0 }

// paper constant (Park_quanto): covariance-aware FX multiplier
const C_STAR = -0.548

// textbook-foil vols: the lattice can only take one number. σ_diff is the bare
// diffusion vol a desk would read off; σ_total also folds in the jump variance
// λ(θ_J²+δ_J²) — but a GBM lattice fed σ_total still can't reproduce the jump's
// discrete gaps, the quanto correlation, or the barrier continuity correction.
const SIG_DIFF = sigma1
const SIG_TOT = Math.sqrt(sigma1 * sigma1 + lambda * (thetaJ * thetaJ + deltaJ * deltaJ))

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

// European value (monotone) vs the barrier value (humped, collapsing) across the
// corridor — the shaded gap is exactly what the two knock-outs destroy.
function EuroCompare({ euro, ko, spot }: { euro: number[]; ko: number[]; spot: number }) {
  const [lang] = useLang()
  const yMax = Math.max(...euro) * 1.06
  const x = (s: number) => PAD.left + ((s - L) / (U - L)) * (CW - PAD.left - PAD.right)
  const y = (v: number) => CH - PAD.bottom - (v / yMax) * (CH - PAD.top - PAD.bottom)
  const line = (vals: number[]) => S_GRID.map((s, i) => `${i ? 'L' : 'M'}${x(s).toFixed(1)},${y(vals[i]).toFixed(1)}`).join('')
  const n = S_GRID.length
  let gap = ''
  for (let i = 0; i < n; i++) gap += `${i ? 'L' : 'M'}${x(S_GRID[i]).toFixed(1)},${y(euro[i]).toFixed(1)}`
  for (let i = n - 1; i >= 0; i--) gap += `L${x(S_GRID[i]).toFixed(1)},${y(ko[i]).toFixed(1)}`
  gap += 'Z'
  const euroSpot = atSpot(euro, spot)
  const koSpot = atSpot(ko, spot)
  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label={lang === 'ko' ? '두 배리어 사이의 유러피언 vs 배리어 가치' : 'European vs barrier value across the corridor'}>
      <path d={gap} fill="#b3610f" opacity={0.1} />
      {[L, K, U].map((val) => (
        <g key={val}>
          <line x1={x(val)} y1={PAD.top} x2={x(val)} y2={CH - PAD.bottom} stroke={val === K ? 'var(--line)' : 'var(--accent)'} strokeWidth={1} strokeDasharray={val === K ? '3 3' : undefined} />
          <text x={x(val)} y={CH - PAD.bottom + 14} textAnchor="middle" className="tick">{val}</text>
        </g>
      ))}
      <path d={line(euro)} fill="none" stroke="#2f6db4" strokeWidth={2} />
      <path d={line(ko)} fill="none" stroke="#b3610f" strokeWidth={2} />
      <line x1={x(spot)} y1={PAD.top} x2={x(spot)} y2={CH - PAD.bottom} stroke="var(--muted)" strokeWidth={1} opacity={0.6} />
      <circle cx={x(spot)} cy={y(euroSpot)} r={4.5} fill="#2f6db4" stroke="var(--panel)" strokeWidth={2} />
      <circle cx={x(spot)} cy={y(koSpot)} r={4.5} fill="#b3610f" stroke="var(--panel)" strokeWidth={2} />
      <text x={x(S_GRID[n - 1]) - 4} y={y(euro[n - 1]) - 6} textAnchor="end" className="ex-foil-lbl" fill="#2f6db4">{lang === 'ko' ? '유러피언' : 'European'}</text>
      <text x={x(S_GRID[n - 1]) - 4} y={y(ko[n - 1]) + 14} textAnchor="end" className="ex-foil-lbl" fill="#b3610f">Double-KO</text>
    </svg>
  )
}

// ── textbook lattice foil: CRR double-KO vs the paper's jump-diffusion quanto MC
const LW = 560
const LH = 200
const LPAD = { top: 14, right: 92, bottom: 32, left: 46 }
const CONV_NS = [15, 25, 40, 60, 85, 115, 150, 190, 235, 285, 340]

function LatticeFoil({ spot, paperKo, baseT }: { spot: number; paperKo: number; baseT: number }) {
  const [lang] = useLang()
  const t = useT()
  const [nSteps, setNSteps] = useState(80)
  const [useTotal, setUseTotal] = useState(false)
  const sigma = useTotal ? SIG_TOT : SIG_DIFF
  const base = { U, L, T: baseT, r: rUS }

  // exact one-factor GBM double-KO (closed form, no noise) at the desk spot —
  // the true number the lattice only approximates; still the wrong physics
  const exact = useMemo(() => gbmDoubleKOprob({ ...base, S0: spot, sigma }), [spot, sigma]) // eslint-disable-line react-hooks/exhaustive-deps
  // the lattice's own estimate at the chosen step count
  const crrAtN = useMemo(() => crrDoubleKO({ ...base, K, S0: spot, sigma, N: nSteps }).koProb, [spot, sigma, nSteps]) // eslint-disable-line react-hooks/exhaustive-deps
  // CRR across N at the desk spot — the oscillation diagnostic
  const conv = useMemo(() => koConvergence({ ...base, K, S0: spot, sigma }, CONV_NS), [spot, sigma]) // eslint-disable-line react-hooks/exhaustive-deps

  const modelGap = (paperKo - exact) * 100 // jumps + quanto, noise-free

  const yMax = 0.6
  const xN = (n: number) => LPAD.left + ((n - CONV_NS[0]) / (CONV_NS[CONV_NS.length - 1] - CONV_NS[0])) * (LW - LPAD.left - LPAD.right)
  const yK = (v: number) => LH - LPAD.bottom - (Math.min(v, yMax) / yMax) * (LH - LPAD.top - LPAD.bottom)
  const path = (pts: { N: number; koProb: number }[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${xN(p.N).toFixed(1)},${yK(p.koProb).toFixed(1)}`).join('')
  const nClamp = Math.min(Math.max(nSteps, CONV_NS[0]), CONV_NS[CONV_NS.length - 1])

  return (
    <figure className="ex-panel ex-foil">
      <h3>{lang === 'ko' ? '교과서 데스크가 볼 수 없는 것' : <>What the textbook desk can&rsquo;t see</>} <span className="ex-foil-tag">{t('model risk')}</span></h3>
      <p className="ex-foil-sub">
        {lang === 'ko' ? (
          <>
            같은 녹아웃인데 숫자는 셋. 표준 이항 트리 도구도, 그 도구가 수렴해 가는
            1-요인 GBM 정확해도 이 헤지가 세 번에 한 번꼴로 사라진다고 봅니다. 점프-확산
            퀀토 엔진의 답은 거의 절반. 이 격차가{' '}
            <strong>교과서 모델로는 표현할 수 없는 생존 리스크</strong>입니다. 가격
            점프도 환율 상관도 1-요인 GBM에는 들어갈 자리가 없고, 2008년 배리어
            장부들이 무너진 것도 바로 그 과소평가에서 시작됐습니다.
          </>
        ) : (
          <>
            Same knock-out, three numbers. The standard binomial desk tool (and even the
            exact one-factor GBM formula it&rsquo;s chasing) says this hedge dies about a third
            of the time. Our jump-diffusion quanto engine says nearly half. That gap is
            <strong> survival risk the textbook cannot represent</strong>: no price jumps, no FX
            correlation. Understating it is exactly how the 2008 barrier books blew up.
          </>
        )}
      </p>

      <div className="ex-foil-ctrl">
        <label>
          <span className="ex-plabel">
            {t('Lattice steps N')}
            <HelpDot text={t('Binomial tree steps — more steps, less numerical wobble')} subject={t('Lattice steps N')} />
          </span>
          <input type="range" min={10} max={340} step={2} value={nSteps} onChange={(e) => setNSteps(Number(e.target.value))} />
          <span className="ex-pval">{nSteps}</span>
        </label>
        <div className="ex-foil-toggle">
          <button className={!useTotal ? 'active' : ''} onClick={() => setUseTotal(false)}>{lang === 'ko' ? 'σ 확산' : 'σ diffusive'} {SIG_DIFF.toFixed(3)}</button>
          <button className={useTotal ? 'active' : ''} onClick={() => setUseTotal(true)}>{lang === 'ko' ? 'σ + 점프분산' : 'σ + jump var'} {SIG_TOT.toFixed(3)}</button>
        </div>
      </div>

      <div className="ex-foil-tiles">
        <div className="tile naive">
          <span className="tile-label">{t('Textbook desk says')}</span>
          <span className="tile-value">{(exact * 100).toFixed(1)}<span className="tile-unit">%</span></span>
          <span className="tile-sub">{lang === 'ko' ? `정확 GBM · 래티스 @N${nSteps} 값 ${(crrAtN * 100).toFixed(1)}%` : `exact GBM · lattice @N${nSteps} reads ${(crrAtN * 100).toFixed(1)}%`}</span>
        </div>
        <div className="tile hero">
          <span className="tile-label">{t('Our engine — true KO odds')}</span>
          <span className="tile-value">{(paperKo * 100).toFixed(1)}<span className="tile-unit">%</span></span>
          <span className="tile-sub">{lang === 'ko' ? `점프-확산 퀀토 · 스팟 $${spot.toFixed(0)} 기준` : `jump-diffusion quanto, at $${spot.toFixed(0)}`}</span>
        </div>
        <div className={modelGap >= 0 ? 'tile danger' : 'tile naive'}>
          <span className="tile-label">{modelGap >= 0 ? t('Risk the textbook hides') : t('Textbook overshoots now')}</span>
          <span className="tile-value">{modelGap >= 0 ? '+' : '−'}{Math.abs(modelGap).toFixed(1)}<span className="tile-unit">pp</span></span>
          <span className="tile-sub">{modelGap >= 0 ? t('understated by the standard tool') : t('pumped σ overshoots — wrong process')}</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${LW} ${LH}`} role="img" aria-label={t('Knock-out probability: lattice vs exact GBM vs paper')}>
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

        {/* our engine (reality) — the authoritative number */}
        <line x1={LPAD.left} y1={yK(paperKo)} x2={LW - LPAD.right} y2={yK(paperKo)} stroke="#2f6db4" strokeWidth={2} strokeDasharray="6 4" />
        <text x={LPAD.left + 6} y={yK(paperKo) - 7} className="ex-foil-lbl" fill="#2f6db4">{lang === 'ko' ? '우리 엔진' : 'our engine'} · {(paperKo * 100).toFixed(0)}%</text>

        {/* textbook: exact one-factor GBM (closed form) — the truth the lattice chases */}
        <line x1={LPAD.left} y1={yK(exact)} x2={LW - LPAD.right} y2={yK(exact)} stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="3 3" />
        <text x={LPAD.left + 6} y={yK(exact) - 7} className="ex-foil-lbl" fill="var(--muted)">{lang === 'ko' ? '교과서 (정확 GBM)' : 'textbook (exact GBM)'} · {(exact * 100).toFixed(0)}%</text>

        {/* CRR convergence at the desk spot — the wobble is numerical error */}
        <path d={path(conv)} fill="none" stroke="#b3610f" strokeWidth={2} />
        <text x={LW - LPAD.right + 6} y={yK(conv[conv.length - 1].koProb) + 4} className="ex-foil-lbl" fill="#b3610f">{lang === 'ko' ? '래티스' : 'lattice'}</text>

        {/* current N marker */}
        <line x1={xN(nClamp)} y1={LPAD.top} x2={xN(nClamp)} y2={LH - LPAD.bottom} stroke="var(--muted)" strokeWidth={1} opacity={0.4} />
      </svg>

      <ul className="ex-foil-why">
        {lang === 'ko' ? (
          <>
            <li><strong>교과서 값은 높은 쪽이 아니라 낮은 쪽으로 틀렸습니다.</strong> 녹아웃이 터지는 순간 헤지는 사라지고 익스포저만 고스란히 남습니다. KO 확률을 낮게 잡는 도구는, 이 구조가 막으라고 존재하는 바로 그 재앙을 과소평가하는 셈입니다.</li>
            <li><strong>수치 오차는 곁가지입니다.</strong> 톱니 모양 선(래티스)과 회색 선(GBM 정확해)의 차이는 1pp 남짓으로, 노드 스트래들링(Boyle–Lau) 때문이며 N을 키우면 사라집니다. 정작 문제가 되는 {Math.abs(modelGap).toFixed(0)}pp 격차는 계산이 아니라 모델 선택에서 나옵니다.</li>
            <li><strong>1-요인 모델로는 퀀토를 다룰 수 없습니다.</strong> 교과서 모델에는 FX 레그 자체가 없어서, 논문의 퀀토 델타 Δ_FX = V/S₂도 공분산 승수 c* = {C_STAR}도 정의되지 않습니다. 그 숫자로 헤지하면 상관 익스포저가 고스란히 열려 있게 됩니다.</li>
          </>
        ) : (
          <>
            <li><strong>The textbook is too low, not too high.</strong> A knock-out turns your hedge into naked exposure the instant it fires, so a desk tool that lowballs the KO odds underprices the exact disaster the structure exists to survive. Our engine is the one telling the truth.</li>
            <li><strong>And the math error is the small part.</strong> The jittery line (lattice) vs the grey line (exact GBM) differ by ~1pp: pure node straddling (Boyle–Lau), and it shrinks as you crank N. The {Math.abs(modelGap).toFixed(0)}pp that matters is model, not arithmetic.</li>
            <li><strong>One factor can&rsquo;t carry a quanto.</strong> There is no FX leg in the textbook world, so the paper&rsquo;s quanto delta Δ_FX = V/S₂ and covariance multiplier c* = {C_STAR} do not exist at all. Hedge off the textbook number and the correlation exposure stays wide open.</li>
          </>
        )}
      </ul>
    </figure>
  )
}

export default function ExoticDesk() {
  // spot stays live — always seeded from the latest FRED WTI close, never persisted
  const [spot, setSpot] = useState(() => clamp(MARKET.wti.value, S_GRID[0], S_GRID[S_GRID.length - 1]))
  const [ti, setTi] = usePersistentState('exotic.ti', 0)

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

  // ── European ablation: same jump-diffusion calibration, barrier removed ──
  const [mode, setMode] = usePersistentState<'ko' | 'euro'>('exotic.mode', 'ko')
  const euro = useMemo(() => europeanQuanto(spot, K, T_GRID[ti], CALIB), [spot, ti])
  const euroCurve = useMemo(() => S_GRID.map((s) => europeanQuanto(s, K, T_GRID[ti], CALIB).value), [ti])
  const euroLive = euro.value * fxScale
  const destroyed = euro.value > 0 ? (euro.value - v) / euro.value : 0 // barrier effect (FX-independent)

  const spine = useSpine()
  const toast = useToast()
  const { state: erp, dispatch, role } = useErp()
  const t = useT()
  const [lang] = useLang()
  const [bookDiv, setBookDiv] = useState(erp.divisions[0].id)
  const [bookNot, setBookNot] = useState('0.25')
  const canBook = role === 'treasury'

  const bookQuanto = () => {
    if (!canBook) return
    const n = Number(bookNot)
    if (!n || n <= 0) return
    dispatch({
      type: 'bookTrade',
      trade: {
        division: bookDiv,
        instrument: mode === 'euro' ? 'European quanto' : 'Double-KO quanto',
        terms: mode === 'euro' ? `K $${K} · no barrier · ${T_GRID[ti].toFixed(2)}y` : `K $${K} · KO ${L}/${U} · ${T_GRID[ti].toFixed(2)}y`,
        notional: `${n.toFixed(2)}M bbl`,
        by: 'Treasury desk',
        designation: 'CFH-A',
      },
    })
    toast(
      lang === 'ko'
        ? `체결 완료 — ${erp.divisions.find((d) => d.id === bookDiv)?.name} ${n.toFixed(2)}M bbl ${mode === 'euro' ? '유러피언 퀀토' : '퀀토'}.${mode === 'euro' ? '' : ' 배리어 확률은 헤지회계로 전달됩니다.'}`
        : `Booked — ${n.toFixed(2)}M bbl ${mode === 'euro' ? 'European quanto' : 'quanto'} for ${erp.divisions.find((d) => d.id === bookDiv)?.name}.${mode === 'euro' ? '' : ' Barrier odds flow to Accounting.'}`,
    )
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
      <div className="spine-row">
        <MarketChip />
        <Chip from="Budget">
          {lang === 'ko' ? (
            <>예산 배분기의 배분: WTI 레그의 <strong>{(spine.budgetW1 * 100).toFixed(1)}%</strong>를 커버 — 이 데스크 몫 {(spine.budgetW1 * 2.0).toFixed(2)}M bbl</>
          ) : (
            <>allocator's split: cover <strong>{(spine.budgetW1 * 100).toFixed(1)}%</strong> of the WTI leg — {(spine.budgetW1 * 2.0).toFixed(2)}M bbl through this desk</>
          )}
        </Chip>
        <Chip from="Decision Dashboard">
          {lang === 'ko' ? (
            <>공시 d* = <strong>{spine.dStar.toFixed(2)}</strong> · 위험의 가격 Λ = <strong>{spine.lambdaStar.toFixed(2)}</strong> — 모형에서 헤지 수준은 이 가격에 반응합니다</>
          ) : (
            <>disclosure d* = <strong>{spine.dStar.toFixed(2)}</strong> · risk price Λ = <strong>{spine.lambdaStar.toFixed(2)}</strong> — the price hedging responds to in the model</>
          )}
        </Chip>
      </div>

      {/* structure selector — Double-KO (paper surface) vs European ablation */}
      <div className="ins-strat" role="tablist" aria-label={lang === 'ko' ? '퀀토 구조' : 'Quanto structure'}>
        <button role="tab" aria-selected={mode === 'ko'} className={mode === 'ko' ? 'ins-strat-btn active' : 'ins-strat-btn'} onClick={() => setMode('ko')}>
          <span className="ins-strat-name">
            {t('Double-KO quanto')}
            <HelpDot text={t('The paper structure: a double knock-out quanto priced from the jump-diffusion MC surface. Watch the value collapse and the delta reverse as spot nears a barrier.')} subject={t('Double-KO quanto')} />
          </span>
          <span className="ins-strat-tag warn">{t('barrier · paper surface')}</span>
        </button>
        <button role="tab" aria-selected={mode === 'euro'} className={mode === 'euro' ? 'ins-strat-btn active' : 'ins-strat-btn'} onClick={() => setMode('euro')}>
          <span className="ins-strat-name">
            {t('European quanto')}
            <HelpDot text={t('The same jump-diffusion calibration with both barriers removed, priced in closed form. Subtract it from the Double-KO and what is left is exactly the survival risk the barriers inject.')} subject={t('European quanto')} />
          </span>
          <span className="ins-strat-tag">{t('ablation · no barrier')}</span>
        </button>
      </div>
      <p className="ins-strat-blurb">
        {mode === 'ko'
          ? t('The paper structure: a double knock-out quanto priced from the jump-diffusion MC surface. Watch the value collapse and the delta reverse as spot nears a barrier.')
          : t('The same jump-diffusion calibration with both barriers removed, priced in closed form. Subtract it from the Double-KO and what is left is exactly the survival risk the barriers inject.')}
      </p>

      <div className="ex-grid">
        {/* ── control rail: inputs + book, sticky (same cockpit as the vanilla desk) ── */}
        <div className="ex-rail">
          <div className="ex-panel ex-deck">
            <h3>{lang === 'ko' ? `포지션${mode === 'ko' ? ' & 배리어 모니터' : ' — 유러피언'}` : `Position${mode === 'ko' ? ' & barrier monitor' : ' — European'}`}</h3>
            <label data-tour="spot">
              <span className="ex-plabel">
                {t('WTI spot S₁')}
                <HelpDot text={t('Current WTI spot — sets how close you stand to the barriers')} subject={t('WTI spot S₁')} />
              </span>
              <input type="range" min={S_GRID[0]} max={S_GRID[S_GRID.length - 1]} step={0.5} value={spot} onChange={(e) => setSpot(Number(e.target.value))} />
              <span className="ex-pval">${spot.toFixed(1)}</span>
            </label>
            <label>
              <span className="ex-plabel">
                {t('Time to maturity')}
                <HelpDot text={t('Time left until the structure expires')} subject={t('Time to maturity')} />
              </span>
              <input type="range" min={0} max={T_GRID.length - 1} step={1} value={T_GRID.length - 1 - ti} onChange={(e) => setTi(T_GRID.length - 1 - Number(e.target.value))} />
              <span className="ex-pval">{T_GRID[ti].toFixed(2)}y</span>
            </label>

            {mode === 'ko' ? (
              <>
                <div className={`ex-monitor ${risk.cls}`}>
                  <div className="ex-monitor-head">
                    <span className="ex-risk-icon">{risk.icon}</span> {lang === 'ko' ? '배리어 리스크' : 'Barrier risk'}: {t(risk.label)}
                  </div>
                  <div className="ex-monitor-body">
                    {lang === 'ko' ? 'KO 확률' : 'KO probability'} <strong>{(koP * 100).toFixed(1)}%</strong>
                    <div className="ex-gauge">
                      <div className={`ex-gauge-fill ${risk.cls}`} style={{ width: `${koP * 100}%` }} />
                    </div>
                    <div className="ex-dist">
                      {lang === 'ko' ? (
                        <>상단 배리어 {U}: <strong>{distU.toFixed(1)}%</strong> 거리 · 하단 {L}: <strong>{distL.toFixed(1)}%</strong> 거리</>
                      ) : (
                        <>upper barrier {U}: <strong>{distU.toFixed(1)}%</strong> away · lower {L}: <strong>{distL.toFixed(1)}%</strong> away</>
                      )}
                    </div>
                  </div>
                </div>

                <div className="ex-contingency">
                  {lang === 'ko' ? (
                    <>
                      <strong>KO 대응 계획:</strong> 구조가 녹아웃되면 익스포저는
                      그대로인데 헤지만 사라집니다. 데스크 규칙은 하나 — 남은
                      익스포저는 당일 안에 예산 배분기(바닐라 레그 / 칼라)로
                      되돌립니다. 이 계획은 배리어에 닿기 <em>전에</em> 이미 서
                      있어야 합니다.
                    </>
                  ) : (
                    <>
                      <strong>KO contingency:</strong> if the structure knocks out, the
                      hedge dies while the exposure lives. Desk rule: residual exposure
                      reverts to the budget allocator (vanilla legs / collar) the same
                      day; the plan exists <em>before</em> the barrier is hit.
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="ex-contingency">
                {lang === 'ko' ? (
                  <>
                    <strong>배리어가 없습니다.</strong> 가치는 스팟을 따라 단조롭게
                    오르고, 녹아웃될 것도 없습니다. 논문 구조에서 퀀토 뼈대만 남긴
                    버전으로, 헤지로 체결하기 위해서가 아니라 Double-KO 값에서 빼기
                    위한 비교 기준입니다.
                  </>
                ) : (
                  <>
                    <strong>No barrier.</strong> Value grows monotonically with spot and
                    nothing knocks out: the paper structure stripped to its quanto core.
                    It exists to be subtracted from the Double-KO, not booked as the hedge.
                  </>
                )}
              </div>
            )}
          </div>

          <div className="ins-panel ins-book">
            <h3>{t('Book this structure')}</h3>
            <div className="ins-bookrow">
              <label className="ins-binline">
                {t('Division')}
                <select value={bookDiv} onChange={(e) => setBookDiv(e.target.value)}>
                  {erp.divisions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
              <label className="ins-binline">
                {t('Notional (M bbl)')}
                <input type="text" inputMode="decimal" value={bookNot} onChange={(e) => setBookNot(e.target.value)} />
              </label>
              <button
                className="ins-bookbtn"
                disabled={!canBook}
                title={!canBook ? t('Switch to the Treasury desk role to book') : undefined}
                onClick={bookQuanto}
              >
                {lang === 'ko' ? `${mode === 'euro' ? '유러피언' : '퀀토'} 체결` : `Book ${mode === 'euro' ? 'European' : 'quanto'}`}
              </button>
            </div>
          </div>
        </div>

        {/* ── results main ── */}
        <div className="ex-main fade-swap" key={mode}>
          {mode === 'ko' ? (
            <>
              <div className="ex-tiles">
                <div className="tile">
                  <span className="tile-label">{t('Value (KRW / unit)')}</span>
                  <span className="tile-value">{vLive.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className="tile-badge">{lang === 'ko' ? `실시간 ₩${MARKET.usdkrw.value.toLocaleString()} 기준 — 동차성 재척도` : `at live ₩${MARKET.usdkrw.value.toLocaleString()} — homogeneity rescale`}</span>
                </div>
                <div className="tile">
                  <span className="tile-label">{t('Δ WTI (regression-grid FD)')}</span>
                  <span className="tile-value">{dWti.toFixed(0)}</span>
                </div>
                <div className="tile">
                  <span className="tile-label">{t('Δ FX = V/S₂ (homogeneity thm)')}</span>
                  <span className="tile-value">{dFx.toFixed(2)}</span>
                </div>
                <div className="tile">
                  <span className="tile-label">{t('c* covariance multiplier')}</span>
                  <span className="tile-value">{C_STAR}</span>
                  <span className="tile-badge">{t('paper §c* — vs c=1 naive')}</span>
                </div>
              </div>

              <div className="ex-charts">
                <figure className="ex-panel">
                  <h3>{t('Value across the corridor — the barrier squeeze')}</h3>
                  <Curve values={row.price} color="#2f6db4" spot={spot} fmt={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <figcaption className="ex-cap">
                    {lang === 'ko' ? (
                      <>가치는 S₁을 따라 오르다가 상단 배리어 앞에서 꺾여 내려갑니다. 이 비단조성이 자산별 델타 추정을 무너뜨리고, 논문에서 공분산을 반영한 c*가 1이 아닌 이유이기도 합니다.</>
                    ) : (
                      <>Value rises with S₁ then collapses toward the upper barrier: the non-monotonicity that makes per-asset delta estimation break, and the reason the paper's covariance-aware c* ≠ 1.</>
                    )}
                  </figcaption>
                </figure>

                <figure className="ex-panel">
                  <h3>{t('Knock-out probability')}</h3>
                  <Curve values={row.ko} color="#b3610f" spot={spot} fmt={(v) => `${(v * 100).toFixed(0)}%`} yMaxHint={1.05} />
                  <figcaption className="ex-cap">
                    {lang === 'ko' ? (
                      <>만기 전에 어느 한쪽 배리어에 닿을 Q-측도 확률입니다. 음영 가장자리는 가치가 죽는 구간, 점선은 행사가 K={K}.</>
                    ) : (
                      <>Q-measure probability of hitting either barrier before maturity. Shaded edges are the dead zones; dashed line is the strike K={K}.</>
                    )}
                  </figcaption>
                </figure>
              </div>

              <LatticeFoil spot={spot} paperKo={koP} baseT={T_GRID[0]} />
            </>
          ) : (
            <>
              <div className="ex-tiles">
                <div className="tile">
                  <span className="tile-label">{t('European value (KRW / unit)')}</span>
                  <span className="tile-value">{euroLive.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className="tile-badge">{lang === 'ko' ? '닫힌 해 · 실시간 FX 재척도' : 'closed form · live-FX rescaled'}</span>
                </div>
                <div className="tile">
                  <span className="tile-label">{t('Δ WTI — monotone')}</span>
                  <span className="tile-value">{euro.deltaWTI.toFixed(0)}</span>
                  <span className="tile-badge">{lang === 'ko' ? `항상 ≥ 0 · 같은 지점의 배리어 Δ: ${dWti.toFixed(0)}` : `always ≥ 0 · barrier Δ here: ${dWti.toFixed(0)}`}</span>
                </div>
                <div className="tile">
                  <span className="tile-label">{t('Barrier destroys')}</span>
                  <span className="tile-value" style={{ color: '#b3610f' }}>{(destroyed * 100).toFixed(0)}%</span>
                  <span className="tile-badge">{lang === 'ko' ? `유러피언 가치 대비 · 스팟 $${spot.toFixed(0)} 기준` : `of European value, at $${spot.toFixed(0)}`}</span>
                </div>
                <div className="tile">
                  <span className="tile-label">{t('c* covariance multiplier')}</span>
                  <span className="tile-value">{C_STAR}</span>
                  <span className="tile-badge">{lang === 'ko' ? '아래 −ρσ₁σ₂ 드리프트에서 나온 값' : 'from the −ρσ₁σ₂ drift below'}</span>
                </div>
              </div>

              <figure className="ex-panel">
                <h3>{t('European vs barrier — what the knock-outs destroy')}</h3>
                <EuroCompare euro={euroCurve} ko={row.price} spot={spot} />
                <figcaption className="ex-cap">
                  {lang === 'ko' ? (
                    <>
                      유러피언 가치(파랑)는 스팟을 따라 매끄럽게 오르는 반면,
                      Double-KO(주황)는 정점을 지나면 배리어 쪽으로 주저앉습니다. 두 곡선
                      사이의 음영이 배리어가 얹는 생존 리스크입니다. 지금 스팟
                      ${spot.toFixed(0)} 기준으로 가치의{' '}
                      <strong>{(destroyed * 100).toFixed(0)}%</strong>. 델타도 함께 일그러져서,
                      이 지점의 델타는 유러피언 +{euro.deltaWTI.toFixed(0)} 대 Double-KO{' '}
                      {dWti.toFixed(0)}. 스팟이 상단 배리어에 다가서면 Double-KO 쪽은 아예
                      음수로 뒤집히는데, 유러피언에서는 절대 나타나지 않는 반전입니다.
                    </>
                  ) : (
                    <>
                      The European value (blue) climbs smoothly with spot; the Double-KO (orange)
                      peaks then collapses toward each barrier. The shaded gap (<strong>{(destroyed * 100).toFixed(0)}%</strong> of
                      value at ${spot.toFixed(0)}) is the survival risk the barriers inject. The barrier
                      also crushes the delta: European Δ = +{euro.deltaWTI.toFixed(0)} here vs the Double-KO&rsquo;s {dWti.toFixed(0)},
                      and it turns negative as spot nears the upper barrier, a reversal the European never shows.
                    </>
                  )}
                </figcaption>
              </figure>

              <div className="ex-panel">
                <h3>{t('Where c* comes from')}</h3>
                <p className="ex-cap" style={{ paddingTop: 0 }}>
                  {lang === 'ko' ? (
                    <>
                      유러피언 드리프트는 r<sub>US</sub> − <strong>ρσ₁σ₂</strong>입니다.
                      이 −ρσ₁σ₂ 항(ρ = {rho}, σ₁ = {sigma1.toFixed(3)}, σ₂ = {sigma2.toFixed(3)})이
                      바로 c = 1로 계산하는 데스크가 빠뜨리는 퀀토 공분산 보정입니다.
                      논문은 이를 공분산 승수 <strong>c* = {C_STAR}</strong>로 정규화합니다.
                      배리어가 있든 없든, c = 1로 두는 순간 퀀토 레그의 가격은 이미
                      어긋나 있습니다.
                    </>
                  ) : (
                    <>
                      The European drift is r<sub>US</sub> − <strong>ρσ₁σ₂</strong>: the −ρσ₁σ₂ term
                      (ρ = {rho}, σ₁ = {sigma1.toFixed(3)}, σ₂ = {sigma2.toFixed(3)}) is the quanto covariance
                      correction the naive c = 1 desk drops. The paper normalises it to the covariance
                      multiplier <strong>c* = {C_STAR}</strong>. Barrier or not, the quanto leg is already
                      mispriced the moment you set c = 1.
                    </>
                  )}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
