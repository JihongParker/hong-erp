import { useEffect, useMemo, useRef, useState } from 'react'
import {
  hedgeAt,
  lambdaOf,
  solveEquilibrium,
  type ModelParams,
} from '../engine/model'
import { Chip, useSpine } from '../state/spine'
import { timeAgo, useErp } from '../state/erp'
import { usePersistentState } from '../state/persist'
import { usePulse } from '../components/usePulse'
import Activity from '../components/Activity'
import ParamRow from '../components/ParamRow'
import { useT, useLang } from '../i18n'
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
      { key: 'sigmaF', label: 'σ_f financial vol', min: 0.2, max: 3, step: 0.05 },
      { key: 'sigmaC', label: 'σ_c climate vol', min: 0.2, max: 3, step: 0.05 },
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
  const t = useT()
  const [lang] = useLang()
  const [p, setP] = usePersistentState<ModelParams>('dashboard.params', DEFAULTS)
  const [hoverD, setHoverD] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const eq = useMemo(() => solveEquilibrium(p), [p])
  // settle-only pulses for the four result tiles
  const pulseD = usePulse(eq.dStar)
  const pulseHf = usePulse(eq.hF)
  const pulseHc = usePulse(eq.hC)
  const pulseLam = usePulse(eq.lambdaAtD)
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
    spine.publish({ dStar: eq.dStar, lambdaStar: eq.lambdaAtD, floorBinding: eq.floorBinding })
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
  ] as const

  return (
    <div className="db">
      <div className="spine-row">
        <Chip from="Materiality">
          {lang === 'ko' ? (
            <>중대 리스크 <strong>{spine.materialCount}</strong>개(기준 ≥{spine.materialityThreshold.toFixed(1)}) — 이 계층이 관리하는 위험 목록</>
          ) : (
            <><strong>{spine.materialCount}</strong> material risks (≥{spine.materialityThreshold.toFixed(1)}) — the risk register this layer manages</>
          )}
        </Chip>
        <Chip from="Budget">
          {lang === 'ko' ? (
            <>예산 배분기가 정한 비중 <strong>{(spine.budgetW1 * 100).toFixed(1)}% / {(spine.budgetW2 * 100).toFixed(1)}%</strong> (WTI / FX)</>
          ) : (
            <>allocator split <strong>{(spine.budgetW1 * 100).toFixed(1)}% / {(spine.budgetW2 * 100).toFixed(1)}%</strong> WTI/FX</>
          )}
        </Chip>
        <Chip from="Hedge Accounting">
          {(() => {
            const nA = erp.trades.filter((tr) => tr.designation === 'CFH-A').length
            const nB = erp.trades.filter((tr) => tr.designation === 'CFH-B').length
            const nF = erp.trades.filter((tr) => tr.designation === 'FVTPL').length
            return lang === 'ko' ? (
              <>지정 구성 A {nA} · B {nB} · FVTPL {nF} — 위험회피회계 채택이 이 공시 문제의 결과변수(H2)</>
            ) : (
              <>designation mix A {nA} · B {nB} · FVTPL {nF} — adoption is this problem's outcome variable (H2)</>
            )
          })()}
        </Chip>
      </div>
      <div className="db-grid">
        {/* ── parameters: sticky rail, always in view while results react ── */}
        <div className="db-panel db-params">
          {GROUPS.map((g) => (
            <div key={g.title} className="db-group" data-tour={g.title === 'Regulation' ? 'floor' : undefined}>
              <h4>{t(g.title)}</h4>
              {g.params.map((m) => (
                <ParamRow
                  key={m.key}
                  label={t(m.label)}
                  min={m.min}
                  max={m.max}
                  step={m.step}
                  value={p[m.key]}
                  onChange={(v) => set(m.key, v)}
                />
              ))}
            </div>
          ))}
          <button className="db-reset" onClick={() => setP(DEFAULTS)}>
            {t('Reset sliders')}
          </button>
        </div>

        {/* ── results ── */}
        <div className="db-main">
          <div className="db-tiles">
            <div className="tile">
              <span className="tile-label">{t('Disclosure d*')}</span>
              <span className={pulseD ? 'tile-value pulse' : 'tile-value'}>{eq.dStar.toFixed(2)}</span>
              <span className={eq.floorBinding ? 'tile-badge binding' : 'tile-badge'}>
                {eq.floorBinding ? t('floor binding') : t('voluntary interior')}
              </span>
            </div>
            <div className="tile">
              <span className="tile-label">{t('Financial hedge h_f*')}</span>
              <span className={pulseHf ? 'tile-value pulse' : 'tile-value'} style={{ color: C_FIN }}>
                {(eq.hF * 100).toFixed(0)}%
              </span>
            </div>
            <div className="tile">
              <span className="tile-label">{t('Climate hedge h_c*')}</span>
              <span className={pulseHc ? 'tile-value pulse' : 'tile-value'} style={{ color: C_CLI }}>
                {(eq.hC * 100).toFixed(0)}%
              </span>
            </div>
            <div className="tile">
              <span className="tile-label">{t('Risk price Λ(d*)')}</span>
              <span className={pulseLam ? 'tile-value pulse' : 'tile-value'}>{eq.lambdaAtD.toFixed(2)}</span>
            </div>
          </div>

          {/* hedge at a glance */}
          <div className="db-panel">
            <h3>{t('The hedge, at a glance')}</h3>
            {(
              [
                { name: 'Financial leg', h: eq.hF, c: C_FIN },
                { name: 'Climate leg', h: eq.hC, c: C_CLI },
              ] as const
            ).map((leg) => (
              <div key={leg.name} className="hedge-row">
                <span className="hedge-name">{t(leg.name)}</span>
                <div className="hedge-track">
                  <div
                    className="hedge-fill"
                    style={{ width: `${leg.h * 100}%`, background: leg.c }}
                  />
                  {leg.h < 0.82 && (
                    <span className="hedge-open" style={{ left: `${leg.h * 100}%` }}>
                      {lang === 'ko' ? '미커버' : 'open'} {(100 - leg.h * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                <span className="hedge-num">{(leg.h * 100).toFixed(0)}%</span>
              </div>
            ))}
            {eq.floorBinding && (
              <p className="db-callout">
                {lang === 'ko' ? (
                  <>
                    지금은 의무 하한이 바인딩 상태입니다 (d̲ = {p.dFloor.toFixed(1)},
                    자율 최적 {eq.dVoluntary.toFixed(2)}). 강제된 공시가 페널티를 덜어
                    잔여 리스크가 싸지고, 그만큼 헤지가 <em>밀려납니다</em>. 하한
                    슬라이더를 올려 보세요. 두 막대가 같이 줄어듭니다.
                  </>
                ) : (
                  <>
                    The mandated floor d̲ = {p.dFloor.toFixed(1)} binds (voluntary
                    optimum {eq.dVoluntary.toFixed(2)}): forced disclosure buys
                    penalty relief, cheapens residual risk, and <em>crowds out</em>{' '}
                    the hedge: move the floor slider and watch both bars shrink.
                  </>
                )}
              </p>
            )}
          </div>

          {/* h(d) curve */}
          <figure className="db-panel db-plot">
            <h3>{t('Hedge ratios as disclosure varies — h(d)')}</h3>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${CW} ${CH}`}
              role="img"
              aria-label={t('Hedge ratios as a function of disclosure intensity')}
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
                {t('financial')}
              </text>
              <text x={CW - PAD.right + 6} y={y(curve[curve.length - 1].hC) + 4} className="series-label" fill={C_CLI}>
                {t('climate')}
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
              <span className="lg-note">
                {t('Both curves fall as disclosure rises: disclosure cheapens residual risk and substitutes for hedging. Dots mark the equilibrium.')}
              </span>
            </figcaption>
          </figure>

          {/* cost decomposition */}
          <div className="db-panel">
            <h3>{t('Cost at the optimum')}</h3>
            <div className="cost-bar">
              {costSegs.map((s, i) => (
                <div
                  key={s.name}
                  className="cost-seg"
                  style={{ width: `${(s.v / costTotal) * 100}%`, background: C_COST[i] }}
                  title={`${t(s.name)}: ${s.v.toFixed(2)}`}
                />
              ))}
            </div>
            <div className="db-legend">
              {costSegs.map((s, i) => (
                <span key={s.name} className="lg-item">
                  <span className="dot" style={{ background: C_COST[i] }} /> {t(s.name)}{' '}
                  <strong>{s.v.toFixed(2)}</strong>
                </span>
              ))}
              <span className="lg-item">
                {t('Total')} <strong>{costTotal.toFixed(2)}</strong>
              </span>
            </div>
          </div>

          <div className="db-ops">
            <div className="db-panel">
              <h3>{t('Division book')}</h3>
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
                      {lang === 'ko' ? (
                        <>승인 {d.approved}{d.pending > 0 && <> · <em>대기 {d.pending}</em></>} · 딜 {d.trades}건</>
                      ) : (
                        <>{d.approved} approved{d.pending > 0 && <> · <em>{d.pending} pending</em></>} · {d.trades} {d.trades === 1 ? 'trade' : 'trades'}</>
                      )}
                      {d.lastTs > 0 && <> · {timeAgo(d.lastTs)}</>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="db-panel">
              <h3>{t('Recent activity')}</h3>
              <Activity limit={6} />
            </div>
          </div>

          <p className="db-note">
            {lang === 'ko' ? (
              <>
                모델: Λ(d) = φ + λe<sup>−kd</sup>가 잔여 리스크의 가격을 정합니다.
                헤지는 2Λ(d)Σu = p를 코너(KKT) 처리와 함께 풀고, 자율 d*는 2ad = kλe
                <sup>−kd</sup>R에서 나옵니다. 규제는 하한 d ≥ d̲로 들어옵니다. 기존
                ESG 플랫폼은 입력값을 보고하는 데서 멈춥니다. 이 화면이 바로 그들이
                비워 둔 의사결정 레이어입니다.
                <br />
                <strong>근거의 지위.</strong> 위 결과는 모형의 비교정학이며, 가정한
                함수형에서 따라 나온 것이지 데이터에서 추정된 것이 아닙니다. 한국에서
                실제로 시행된 두 공시 규제(지배구조보고서·환경정보공개)에 대해 논문의
                실증 검정은 두 헤지 마진 모두에서 좁게 추정된 영(null)을 보고합니다.
                이는 두 규제가 시장위험 마진의 λ·k·R을 움직이지 않기 때문이라는
                모형의 예측과 부합하지만, 영 결과 자체는 특정 구조에 대한 강한 증거가
                아닙니다. 또한 ESG 공시 데이터에는 그린워싱, 비고전적 측정오차,
                내생성이 내재하므로 이론과 데이터의 일치를 두고도 누락변수와
                역인과관계를 신중히 따져야 합니다. 모형이 <em>움직일 것</em>이라
                예측하는 2027 회계연도 기후공시 의무가 정보량 있는 검정이며, 그때까지
                이 화면의 해석은 잠정적입니다 (논문 §한계).
              </>
            ) : (
              <>
                The model: Λ(d) = φ + λe<sup>−kd</sup> prices residual risk; hedges
                solve 2Λ(d)Σu = p with corner (KKT) handling; voluntary d* solves
                2ad = kλe<sup>−kd</sup>R; a mandate is a floor d ≥ d̲. Incumbent ESG
                platforms stop at reporting the inputs; this screen is the decision
                layer they leave empty.
                <br />
                <strong>Status of the evidence.</strong> These are the model&rsquo;s
                comparative statics, which follow from its assumed functional forms
                rather than from data. On Korea&rsquo;s two <em>realized</em>
                {' '}mandates (the governance report and the environmental-information
                requirement) the paper&rsquo;s executed test returns tightly bounded
                nulls on both hedging margins — consistent with the model, since
                neither mandate moves λ, k or R on the market-risk margin, but weak
                evidence for any particular structure. ESG disclosure data also carry
                greenwashing, non-classical measurement error, and endogeneity, so
                agreement between theory and panel warrants caution about omitted
                variables and reverse causality. The fiscal-2027 climate mandate,
                which the model predicts <em>should</em> move hedging, is the
                informative test; treat what follows as provisional until it runs
                (paper §Limitations).
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}
