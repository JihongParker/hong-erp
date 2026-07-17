import { useMemo, useRef, useState } from 'react'
import {
  black76Call,
  effectiveCost as E,
  solveZeroCostFloor,
  solveThreeWay,
  solveSeagull,
  type MarketParams,
} from '../engine/instruments'
import ExoticDesk from './ExoticDesk'
import { Chip, useSpine } from '../state/spine'
import { useErp, type Trade } from '../state/erp'
import { usePersistentState } from '../state/persist'
import { MARKET } from '../state/market'
import MarketChip from '../components/MarketChip'
import ParamRow from '../components/ParamRow'
import { usePulse } from '../components/usePulse'
import { useToast } from '../components/Toast'
import { useT, useLang } from '../i18n'
import './Instruments.css'

// Series colors — validated palette. The selected strategy is the hero line.
const C_HERO = '#2f6db4'
const C_FWD = '#b3610f'

// forward defaults to the latest FRED WTI close (flat-forward approximation);
// vol and rates stay at the paper calibration
const DEFAULT_MKT: MarketParams = { F: Math.round(MARKET.wti.value), sigma: 0.35, T: 0.5, r: 0.04 }

const CW = 640
const CH = 236
const PAD = { top: 16, right: 110, bottom: 36, left: 52 }

type Strat = 'swap' | 'cap' | 'collar' | 'threeway' | 'seagull'
const STRATS: { key: Strat; name: string; tag: string; blurb: string }[] = [
  { key: 'swap', name: 'Swap / forward', tag: 'linear', blurb: 'Lock the price. Zero premium, zero optionality — the corporate default.' },
  { key: 'cap', name: 'Cap (bought call)', tag: 'option', blurb: 'Buy protection outright, keep all the downside. Costs premium in cash.' },
  { key: 'collar', name: 'Zero-cost collar', tag: 'industry standard', blurb: 'Cap financed by a sold floor. No cash out; you give up participation below the floor.' },
  { key: 'threeway', name: 'Three-way collar', tag: 'sold wing', blurb: 'Collar + a second sold put funds a lower floor, but a crash below it tears the protection back open.' },
  { key: 'seagull', name: 'Seagull', tag: 'sold wing', blurb: 'Collar whose upside cap ends at a ceiling. Cheaper strikes, but a spike past the ceiling re-exposes you.' },
]
const STRAT_NAME: Record<Strat, Trade['instrument']> = {
  swap: 'Swap / forward',
  cap: 'Cap (bought call)',
  collar: 'Zero-cost collar',
  threeway: 'Three-way collar',
  seagull: 'Seagull',
}

// one strategy tile — its own component so each value gets a settle-only pulse
function InsTile({ label, value }: { label: string; value: string }) {
  const pulse = usePulse(value)
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className={pulse ? 'tile-value pulse' : 'tile-value'}>{value}</span>
    </div>
  )
}

export default function Instruments() {
  const [tab, setTab] = usePersistentState<'collar' | 'exotic'>('instruments.tab', 'collar')
  const [strategy, setStrategy] = usePersistentState<Strat>('instruments.strategy', 'collar')
  // Market params: σ/T/r persist, but the forward F is always re-seeded from the
  // live FRED WTI close — persisting F would freeze the desk to a stale price.
  const [mktUser, setMktUser] = usePersistentState<Omit<MarketParams, 'F'>>('instruments.mkt', {
    sigma: DEFAULT_MKT.sigma,
    T: DEFAULT_MKT.T,
    r: DEFAULT_MKT.r,
  })
  const [fFwd, setFFwd] = useState(DEFAULT_MKT.F)
  const mkt = useMemo<MarketParams>(() => ({ F: fFwd, ...mktUser }), [fFwd, mktUser])
  const [capK, setCapK] = usePersistentState('instruments.capK', () => Math.round(DEFAULT_MKT.F * 1.12))
  const [subFloorK, setSubFloorK] = usePersistentState('instruments.subFloorK', () => Math.round(DEFAULT_MKT.F * 0.78))
  const [ceilK, setCeilK] = usePersistentState('instruments.ceilK', () => Math.round(DEFAULT_MKT.F * 1.34))
  const [hoverS, setHoverS] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const collar = useMemo(() => solveZeroCostFloor(capK, mkt), [capK, mkt])
  const threeway = useMemo(() => solveThreeWay(capK, subFloorK, mkt), [capK, subFloorK, mkt])
  const seagull = useMemo(() => solveSeagull(capK, ceilK, mkt), [capK, ceilK, mkt])
  const capPrem = useMemo(() => black76Call(capK, mkt), [capK, mkt])

  const spine = useSpine()
  const toast = useToast()
  const { state: erp, dispatch, role } = useErp()
  const t = useT()
  const [lang] = useLang()
  const [bookDiv, setBookDiv] = useState(erp.divisions[0].id)
  const [bookNot, setBookNot] = useState('0.50')
  const canBook = role === 'treasury'

  // effective purchase cost of a strategy at terminal price s
  const costOf = (strat: Strat, s: number): number => {
    switch (strat) {
      case 'swap': return E.forward(s, mkt.F)
      case 'cap': return E.capOnly(s, capK, capPrem)
      case 'collar': return E.collar(s, collar.floorK, collar.capK)
      case 'threeway': return E.threeWay(s, threeway.floorK, threeway.capK, threeway.subFloorK)
      case 'seagull': return E.seagull(s, seagull.floorK, seagull.capK, seagull.ceilK)
    }
  }

  // terms string for the blotter, per strategy
  const termsOf = (strat: Strat): string => {
    const T = mkt.T.toFixed(2)
    switch (strat) {
      case 'swap': return `fixed $${mkt.F.toFixed(0)} · ${T}y`
      case 'cap': return `cap $${capK} · prem $${capPrem.toFixed(2)} · ${T}y`
      case 'collar': return `cap $${collar.capK.toFixed(0)} / floor $${collar.floorK.toFixed(2)} · ${T}y`
      case 'threeway': return `cap $${capK} / floor $${threeway.floorK.toFixed(1)} / sub $${threeway.subFloorK} · ${T}y`
      case 'seagull': return `cap $${capK}–$${ceilK} / floor $${seagull.floorK.toFixed(1)} · ${T}y`
    }
  }
  const bookStructure = () => {
    if (!canBook) return
    const n = Number(bookNot)
    if (!n || n <= 0) return
    dispatch({
      type: 'bookTrade',
      trade: {
        division: bookDiv,
        instrument: STRAT_NAME[strategy],
        terms: termsOf(strategy),
        notional: `${n.toFixed(2)}M bbl`,
        by: 'Treasury desk',
        designation: 'CFH-B',
      },
    })
    toast(
      lang === 'ko'
        ? `부킹 완료 — ${erp.divisions.find((d) => d.id === bookDiv)?.name} ${n.toFixed(2)}M bbl ${t(STRAT_NAME[strategy])}. 헤지회계 딜 블로터에서 확인.`
        : `Booked — ${n.toFixed(2)}M bbl ${STRAT_NAME[strategy]} for ${erp.divisions.find((d) => d.id === bookDiv)?.name}. See the blotter in Hedge Accounting.`,
    )
  }

  const sMin = 0.4 * mkt.F
  const sMax = 1.9 * mkt.F
  const yMin = Math.min(collar.floorK, sMin)
  const yMax = Math.max(capK * 1.35, sMax * 0.72)

  const x = (s: number) => PAD.left + ((s - sMin) / (sMax - sMin)) * (CW - PAD.left - PAD.right)
  const y = (v: number) =>
    CH - PAD.bottom - ((v - yMin) / (yMax - yMin)) * (CH - PAD.top - PAD.bottom)

  const N = 140
  const samples = useMemo(
    () =>
      Array.from({ length: N + 1 }, (_, i) => {
        const s = sMin + (i / N) * (sMax - sMin)
        return { s, unhedged: s, forward: mkt.F, hero: costOf(strategy, s) }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mkt, strategy, collar, threeway, seagull, capK, capPrem, sMin, sMax],
  )

  const line = (key: 'unhedged' | 'forward' | 'hero') =>
    samples
      .map((pt, i) => `${i ? 'L' : 'M'}${x(pt.s).toFixed(1)},${y(Math.min(pt[key], yMax)).toFixed(1)}`)
      .join('')

  const hoverPt = hoverS == null ? null : samples[Math.round(((hoverS - sMin) / (sMax - sMin)) * N)]

  const onMove = (e: React.MouseEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    const fx = ((e.clientX - rect.left) / rect.width) * CW
    const s = sMin + ((fx - PAD.left) / (CW - PAD.left - PAD.right)) * (sMax - sMin)
    setHoverS(s < sMin || s > sMax ? null : s)
  }

  const setM = (key: keyof MarketParams, v: number) => {
    if (key === 'F') setFFwd(v)
    else setMktUser((prev) => ({ ...prev, [key]: v }))
  }

  // tiles per strategy: [label, value][]
  const tiles: [string, string][] = (() => {
    switch (strategy) {
      case 'swap': return [['Locked price', `$${mkt.F.toFixed(0)}`], ['Upfront premium', '$0'], ['Downside kept', 'none'], ['Optionality', 'none']]
      case 'cap': return [['Cap (bought call)', `$${capK}`], ['Premium (cash)', `$${capPrem.toFixed(2)}`], ['Worst-case cost', `$${(capK + capPrem).toFixed(1)}`], ['Downside kept', 'all']]
      case 'collar': return [['Cap', `$${collar.capK.toFixed(0)}`], ['Floor', `$${collar.floorK.toFixed(2)}`], ['Net premium', '$0.00'], ['Protected band', `$${(collar.capK - collar.floorK).toFixed(1)}`]]
      case 'threeway': return [['Cap', `$${capK}`], ['Floor', `$${threeway.floorK.toFixed(2)}`], ['Tears below', `$${threeway.subFloorK}`], ['Net premium', '$0.00']]
      case 'seagull': return [['Cap', `$${capK}`], ['Ceiling (tears)', `$${ceilK}`], ['Floor', `$${seagull.floorK.toFixed(2)}`], ['Net premium', '$0.00']]
    }
  })()

  // full comparison table — every strategy priced off the same market
  const ko = lang === 'ko'
  const rows: { key: Strat | 'unhedged'; label: string; premium: string; worst: string; best: string; giveup: string }[] = [
    { key: 'unhedged', label: t('Unhedged'), premium: '$0', worst: ko ? '무제한' : 'unbounded', best: '→ $0', giveup: ko ? '없음 · 꼬리 리스크 전부 부담' : 'nothing; you carry the whole tail' },
    { key: 'swap', label: t('Swap / forward'), premium: '$0', worst: `$${mkt.F.toFixed(1)}`, best: `$${mkt.F.toFixed(1)}`, giveup: ko ? '유가 하락 시 이익 전부' : 'all downside participation' },
    { key: 'cap', label: t('Cap only (bought call)'), premium: `$${capPrem.toFixed(2)}`, worst: `$${(capK + capPrem).toFixed(1)}`, best: ko ? '→ 프리미엄만' : '→ premium only', giveup: ko ? '현금으로 낸 프리미엄' : 'the premium, paid in cash' },
    { key: 'collar', label: t('Zero-cost collar'), premium: '$0', worst: `$${collar.capK.toFixed(1)}`, best: `$${collar.floorK.toFixed(1)}`, giveup: ko ? `$${collar.floorK.toFixed(1)} 아래 하락 이익` : `participation below $${collar.floorK.toFixed(1)}` },
    { key: 'threeway', label: t('Three-way collar'), premium: '$0', worst: `$${Math.max(capK, threeway.floorK + threeway.subFloorK).toFixed(1)} ${ko ? '(급락 시)' : '(crash)'}`, best: `$${threeway.floorK.toFixed(1)}`, giveup: ko ? `$${threeway.subFloorK} 아래 급락 시 보호 소멸` : `protection tears below $${threeway.subFloorK}` },
    { key: 'seagull', label: t('Seagull'), premium: '$0', worst: ko ? '무제한 (급등 시)' : 'unbounded (spike)', best: `$${seagull.floorK.toFixed(1)}`, giveup: ko ? `$${ceilK} 위로는 보호 없음` : `protection ends at $${ceilK}` },
  ]

  // 3:2:1 crack spread — refiners hedge the MARGIN, not just crude. Illustrative
  // product prices ($/bbl) default to typical cracks over the crude forward.
  const [gaso, setGaso] = useState(() => Math.round(DEFAULT_MKT.F + 22))
  const [dist, setDist] = useState(() => Math.round(DEFAULT_MKT.F + 28))
  const crack321 = (2 * gaso + 1 * dist - 3 * mkt.F) / 3

  return (
    <div className="ins">
      <div className="ins-tabs">
        <button className={tab === 'collar' ? 'ins-tab active' : 'ins-tab'} onClick={() => setTab('collar')}>
          <span className="ins-tab-title">{lang === 'ko' ? '바닐라 데스크' : 'Vanilla desk'} <span className="ins-tag">{t('industry standard')}</span></span>
          <span className="ins-tab-sub">{t('Swap · cap · collar · three-way · seagull: the structures refiners actually run, Black-76 priced')}</span>
        </button>
        <button className={tab === 'exotic' ? 'ins-tab active' : 'ins-tab'} data-tour="exotic-tab" onClick={() => setTab('exotic')}>
          <span className="ins-tab-title">Double-KO {lang === 'ko' ? '퀀토' : 'quanto'} <span className="ins-tag research">{t('research')}</span></span>
          <span className="ins-tab-sub">{t("Barrier analytics from the paper's engine: where textbook deltas reverse sign")}</span>
        </button>
      </div>

      {tab === 'exotic' ? (
        <ExoticDesk />
      ) : (
        <>
          <div className="spine-row">
            <MarketChip />
            <Chip from="Budget">
              {lang === 'ko' ? (
                <>예산 배분기 지시: WTI 레그의 <strong>{(spine.budgetW1 * 100).toFixed(1)}%</strong>를 커버 — 이 데스크 몫 {(spine.budgetW1 * 2.0).toFixed(2)}M bbl</>
              ) : (
                <>allocator says cover <strong>{(spine.budgetW1 * 100).toFixed(1)}%</strong> of the WTI leg — {(spine.budgetW1 * 2.0).toFixed(2)}M bbl through this desk</>
              )}
            </Chip>
            <Chip from="Decision Dashboard">
              {lang === 'ko' ? (
                <>공시 d* = <strong>{spine.dStar.toFixed(2)}</strong>가 이 헤지가 마주할 잔여 리스크의 가격을 정합니다</>
              ) : (
                <>disclosure d* = <strong>{spine.dStar.toFixed(2)}</strong> sets the residual-risk price the hedge answers to</>
              )}
            </Chip>
          </div>

          {/* ── strategy library selector ── */}
          <div className="ins-strat" data-tour="strat" role="tablist" aria-label={lang === 'ko' ? '헤지 전략' : 'Hedge strategy'}>
            {STRATS.map((s) => (
              <button
                key={s.key}
                role="tab"
                aria-selected={strategy === s.key}
                className={strategy === s.key ? 'ins-strat-btn active' : 'ins-strat-btn'}
                onClick={() => setStrategy(s.key)}
              >
                <span className="ins-strat-name">{t(s.name)}</span>
                <span className={s.tag === 'sold wing' ? 'ins-strat-tag warn' : 'ins-strat-tag'}>{t(s.tag)}</span>
              </button>
            ))}
          </div>
          <p className="ins-strat-blurb">{t(STRATS.find((s) => s.key === strategy)!.blurb)}</p>

          <div className="ins-grid">
            <div className="ins-rail">
              <div className="ins-panel ins-deck" data-tour="cap">
                <h3>{t('Market & structure')}</h3>
                {(
                  [
                    { key: 'F', label: 'F forward', min: 50, max: 130, step: 1, fmt: (v: number) => `$${v.toFixed(0)}` },
                    { key: 'sigma', label: 'σ volatility', min: 0.1, max: 0.8, step: 0.01, fmt: (v: number) => `${(v * 100).toFixed(0)}%` },
                    { key: 'T', label: 'T maturity', min: 0.1, max: 2, step: 0.05, fmt: (v: number) => `${v.toFixed(2)}y` },
                    { key: 'r', label: 'r rate', min: 0, max: 0.08, step: 0.0025, fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
                  ] as const
                ).map((m) => (
                  <ParamRow key={m.key} label={t(m.label)} min={m.min} max={m.max} step={m.step} value={mkt[m.key]} onChange={(v) => setM(m.key, v)} fmt={m.fmt} />
                ))}
                {strategy !== 'swap' && (
                  <ParamRow label={t('Kc cap strike')} min={Math.round(mkt.F)} max={Math.round(mkt.F * 1.5)} step={1} value={capK} onChange={setCapK} fmt={(v) => `$${v.toFixed(0)}`} />
                )}
                {strategy === 'threeway' && (
                  <ParamRow label={t('Kp2 sold sub-floor')} min={Math.round(mkt.F * 0.5)} max={Math.round(mkt.F * 0.92)} step={1} value={subFloorK} onChange={setSubFloorK} fmt={(v) => `$${v.toFixed(0)}`} />
                )}
                {strategy === 'seagull' && (
                  <ParamRow label={t('Kc2 sold ceiling')} min={Math.round(mkt.F * 1.15)} max={Math.round(mkt.F * 1.7)} step={1} value={ceilK} onChange={setCeilK} fmt={(v) => `$${v.toFixed(0)}`} />
                )}
                <p className="ins-muted">
                  {strategy === 'swap' && t('A swap just fixes the price at the forward: nothing to solve.')}
                  {strategy === 'cap' && t('Buy the call outright; the premium is paid in cash upfront.')}
                  {strategy === 'collar' && t('Pick the cap; the solver finds the floor whose written put exactly finances the purchased call.')}
                  {strategy === 'threeway' && t('The extra sold put funds a lower floor than a plain collar, at the cost of a torn tail below it.')}
                  {strategy === 'seagull' && t('Selling a far call cheapens the structure and lowers the floor, but caps how far your protection reaches.')}
                </p>
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
                    onClick={bookStructure}
                  >
                    {lang === 'ko' ? `${t(STRAT_NAME[strategy])} 부킹` : `Book ${STRAT_NAME[strategy].toLowerCase()}`}
                  </button>
                </div>
              </div>
            </div>

            <div className="ins-main fade-swap" key={strategy}>
              <div className="ins-tiles">
                {tiles.map(([label, value]) => (
                  <InsTile key={label} label={label} value={value} />
                ))}
              </div>

              <figure className="ins-panel ins-plot">
                <h3>{lang === 'ko' ? '만기 시 실효 매입 비용' : 'Effective purchase cost at expiry'} — {t(STRAT_NAME[strategy])}</h3>
                <svg ref={svgRef} viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label={lang === 'ko' ? `실효 매입 비용, ${t(STRAT_NAME[strategy])}` : `Effective purchase cost, ${STRAT_NAME[strategy]}`} onMouseMove={onMove} onMouseLeave={() => setHoverS(null)}>
                  {/* grid */}
                  {[0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8].map((f) => (
                    <g key={f}>
                      <line x1={x(f * mkt.F)} y1={PAD.top} x2={x(f * mkt.F)} y2={CH - PAD.bottom} stroke="var(--line)" strokeWidth={1} />
                      <text x={x(f * mkt.F)} y={CH - PAD.bottom + 16} textAnchor="middle" className="tick">{(f * mkt.F).toFixed(0)}</text>
                    </g>
                  ))}
                  <text x={(PAD.left + CW - PAD.right) / 2} y={CH - 4} textAnchor="middle" className="axis-title">terminal price S_T →</text>

                  {/* reference: unhedged + forward, then the selected strategy as hero */}
                  <path d={line('unhedged')} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="5 4" />
                  <path d={line('forward')} fill="none" stroke={C_FWD} strokeWidth={1.75} opacity={0.7} />
                  <path d={line('hero')} fill="none" stroke={C_HERO} strokeWidth={2.75} />
                  <text x={CW - PAD.right + 6} y={y(Math.min(samples[N].hero, yMax)) + 4} className="series-label" fill={C_HERO}>{strategy === 'swap' ? 'swap' : STRAT_NAME[strategy].split(' ')[0].toLowerCase()}</text>

                  {hoverPt && (
                    <>
                      <line x1={x(hoverPt.s)} y1={PAD.top} x2={x(hoverPt.s)} y2={CH - PAD.bottom} stroke="var(--muted)" strokeWidth={1} opacity={0.5} />
                      <circle cx={x(hoverPt.s)} cy={y(Math.min(hoverPt.hero, yMax))} r={4} fill={C_HERO} stroke="var(--panel)" strokeWidth={2} />
                    </>
                  )}
                </svg>
                {hoverPt && (
                  <div className="ins-tooltip" style={{ left: `${(x(hoverPt.s) / CW) * 100}%` }}>
                    S_T ${hoverPt.s.toFixed(1)} · {strategy} ${hoverPt.hero.toFixed(1)} · {lang === 'ko' ? '무헤지' : 'unhedged'} ${hoverPt.unhedged.toFixed(1)}
                  </div>
                )}
                <figcaption className="ins-legend">
                  <span className="lg-item"><span className="dot" style={{ background: C_HERO }} /> {t(STRAT_NAME[strategy])}</span>
                  <span className="lg-item"><span className="dot" style={{ background: C_FWD }} /> {lang === 'ko' ? '선도' : 'Forward'}</span>
                  <span className="lg-item"><span className="dot dashed" /> {t('Unhedged')}</span>
                </figcaption>
              </figure>

              <div className="ins-panel">
                <h3>{t('Strategy comparison — one market, every structure')}</h3>
                <div className="ins-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('Strategy')}</th>
                        <th className="num">{t('Upfront premium')}</th>
                        <th className="num">{t('Worst-case cost')}</th>
                        <th className="num">{t('Best-case cost')}</th>
                        <th>{t('What you give up')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.key} className={r.key === strategy ? 'hl' : undefined}>
                          <td>{r.label}</td>
                          <td className="num">{r.premium}</td>
                          <td className="num">{r.worst}</td>
                          <td className="num">{r.best}</td>
                          <td>{r.giveup}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="ins-warning">
                {t(`"Zero cost" is not "no cost" — every sold leg is short optionality, paid for in scenarios rather than cash. Push it one step further and the sold wing becomes a barrier: the three-way and seagull are one calibration away from the knock-in/knock-out structures that devastated Korean SMEs in 2008. Barrier analytics for exactly that risk are the Exotic Desk's job (research tab).`)}
              </p>

              {/* ── refiner-specific: 3:2:1 crack spread ── */}
              <div className="ins-panel ins-crack">
                <h3>{t("Refiner's own hedge — the 3:2:1 crack spread")}</h3>
                <p className="ins-muted">
                  {lang === 'ko' ? (
                    <>
                      정유사의 진짜 익스포저는 원유 가격이 아니라 <em>마진</em>입니다.
                      원유 3배럴을 사서 휘발유 2배럴과 중간유분 1배럴을 파는 구조라,
                      크랙 스왑과 옵션은 이 스프레드 자체를 고정합니다. 위의 어떤
                      상품과도 기초자산이 다릅니다.
                    </>
                  ) : (
                    <>
                      A refiner's real exposure is the <em>margin</em>, not the crude price:
                      buy 3 barrels of crude, sell 2 gasoline + 1 distillate. Crack swaps and
                      options lock this spread directly, a different underlying from anything above.
                    </>
                  )}
                </p>
                <div className="ins-crackrow">
                  <label className="ins-binline">{t('Gasoline $/bbl')}<input type="number" value={gaso} onChange={(e) => setGaso(Number(e.target.value) || 0)} /></label>
                  <label className="ins-binline">{t('Distillate $/bbl')}<input type="number" value={dist} onChange={(e) => setDist(Number(e.target.value) || 0)} /></label>
                  <div className="ins-crackout">
                    <span className="tile-label">{lang === 'ko' ? `3:2:1 크랙 (원유 $${mkt.F.toFixed(0)})` : `3:2:1 crack (crude $${mkt.F.toFixed(0)})`}</span>
                    <span className="tile-value" style={{ color: crack321 >= 0 ? C_HERO : '#b3610f' }}>${crack321.toFixed(2)}/bbl</span>
                  </div>
                </div>
              </div>

              {/* ── practitioner benchmark: structures this single-name vanilla engine can't price ── */}
              <div className="ins-panel">
                <h3>{t('Practitioner benchmark — beyond the single-name desk')}</h3>
                <div className="ins-cards">
                  <div className="ins-card">
                    <span className="ins-card-tag linear">{t('FX · linear')}</span>
                    <strong>{t('FX forward / NDF')}</strong>
                    <p>{t("The Korean importer's biggest lever is USD/KRW, not crude. Forwards and non-deliverable forwards lock the rate; the workhorse of import hedging.")}</p>
                  </div>
                  <div className="ins-card">
                    <span className="ins-card-tag option">{t('averaging')}</span>
                    <strong>{t('Asian / average-price (APO)')}</strong>
                    <p>
                      {lang === 'ko' ? (
                        <>단순 평균형은 월 단위 익스포저에 맞고 유러피언보다 쌉니다. <em>참고:</em> 논문의 아시안 옵션에는 녹아웃이 붙어 있습니다. 그 배리어 버전은 여기가 아니라 리서치 데스크에서 다룹니다.</>
                      ) : (
                        <>Plain-vanilla averaging matches month-long exposure and is cheaper than European. <em>Note:</em> the paper's Asian is knock-out-exoticized; that barrier version lives in the research desk, not here.</>
                      )}
                    </p>
                  </div>
                  <div className="ins-card warn">
                    <span className="ins-card-tag barrier">{t('FX · barrier-risk')}</span>
                    <strong>TARF</strong>
                    <p>{t('Target-redemption forward, the FX cousin of KIKO. Cheap or credit upfront, embedded knock-outs, and the same survival-risk tail when the currency gaps.')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
