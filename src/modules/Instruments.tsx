import { useMemo, useRef, useState } from 'react'
import {
  black76Call,
  effectiveCost,
  solveZeroCostFloor,
  type MarketParams,
} from '../engine/instruments'
import ExoticDesk from './ExoticDesk'
import { Chip, useSpine } from '../state/spine'
import { useErp } from '../state/erp'
import './Instruments.css'

// Series colors — validated palette, fixed assignment: the collar is the hero.
const C_COLLAR = '#2f6db4'
const C_FWD = '#b3610f'

const DEFAULT_MKT: MarketParams = { F: 85, sigma: 0.35, T: 0.5, r: 0.04 }

const CW = 640
const CH = 320
const PAD = { top: 16, right: 110, bottom: 36, left: 52 }

export default function Instruments() {
  const [tab, setTab] = useState<'collar' | 'exotic'>('collar')
  const [mkt, setMkt] = useState<MarketParams>(DEFAULT_MKT)
  const [capK, setCapK] = useState(95)
  const [hoverS, setHoverS] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const collar = useMemo(() => solveZeroCostFloor(capK, mkt), [capK, mkt])
  const spine = useSpine()
  const { state: erp, dispatch } = useErp()
  const [bookDiv, setBookDiv] = useState(erp.divisions[0].id)
  const [bookNot, setBookNot] = useState('0.50')
  const [booked, setBooked] = useState<string | null>(null)

  const bookCollar = () => {
    const n = Number(bookNot)
    if (!n || n <= 0) return
    dispatch({
      type: 'bookTrade',
      trade: {
        division: bookDiv,
        instrument: 'Zero-cost collar',
        terms: `cap $${collar.capK.toFixed(0)} / floor $${collar.floorK.toFixed(2)} · ${mkt.T.toFixed(2)}y`,
        notional: `${n.toFixed(2)}M bbl`,
        by: 'Treasury desk',
        designation: 'CFH-B',
      },
    })
    setBooked(`Booked — ${n.toFixed(2)}M bbl collar for ${erp.divisions.find((d) => d.id === bookDiv)?.name}. See the blotter in Hedge Accounting.`)
    setTimeout(() => setBooked(null), 4000)
  }
  const capOnlyPremium = useMemo(() => black76Call(capK, mkt), [capK, mkt])

  const sMin = 0.4 * mkt.F
  const sMax = 1.8 * mkt.F
  const yMin = Math.min(collar.floorK, sMin)
  const yMax = Math.max(collar.capK, sMax * 0.75)

  const x = (s: number) => PAD.left + ((s - sMin) / (sMax - sMin)) * (CW - PAD.left - PAD.right)
  const y = (v: number) =>
    CH - PAD.bottom - ((v - yMin) / (yMax - yMin)) * (CH - PAD.top - PAD.bottom)

  const N = 120
  const samples = useMemo(
    () =>
      Array.from({ length: N + 1 }, (_, i) => {
        const s = sMin + (i / N) * (sMax - sMin)
        return {
          s,
          unhedged: effectiveCost.unhedged(s),
          forward: effectiveCost.forward(s, mkt.F),
          collar: effectiveCost.collar(s, collar.floorK, collar.capK),
        }
      }),
    [mkt, collar, sMin, sMax],
  )

  const line = (key: 'unhedged' | 'forward' | 'collar') =>
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

  const setM = (key: keyof MarketParams, v: number) => setMkt((p) => ({ ...p, [key]: v }))

  return (
    <div className="ins">
      <div className="ins-tabs">
        <button className={tab === 'collar' ? 'ins-tab active' : 'ins-tab'} onClick={() => setTab('collar')}>
          Zero-cost collar <span className="ins-tag">industry standard</span>
        </button>
        <button className={tab === 'exotic' ? 'ins-tab active' : 'ins-tab'} data-tour="exotic-tab" onClick={() => setTab('exotic')}>
          Double-KO quanto <span className="ins-tag">research</span>
        </button>
      </div>

      {tab === 'exotic' ? (
        <ExoticDesk />
      ) : (
        <>
          <div className="spine-row">
            <Chip from="Budget">
              allocator says cover <strong>{(spine.budgetW1 * 100).toFixed(1)}%</strong> of the WTI leg — {(spine.budgetW1 * 2.0).toFixed(2)}M bbl through this desk
            </Chip>
            <Chip from="Decision Dashboard">
              disclosure d* = <strong>{spine.dStar.toFixed(2)}</strong> sets the residual-risk price the hedge answers to
            </Chip>
          </div>
          <div className="ins-grid">
            <div className="ins-tiles">
              <div className="tile">
                <span className="tile-label">Cap (bought call)</span>
                <span className="tile-value">${collar.capK.toFixed(0)}</span>
              </div>
              <div className="tile">
                <span className="tile-label">Floor (written put)</span>
                <span className="tile-value">${collar.floorK.toFixed(2)}</span>
              </div>
              <div className="tile">
                <span className="tile-label">Net premium</span>
                <span className="tile-value">${Math.abs(collar.netPremium) < 0.005 ? '0.00' : collar.netPremium.toFixed(2)}</span>
              </div>
              <div className="tile">
                <span className="tile-label">Protected band</span>
                <span className="tile-value">${(collar.capK - collar.floorK).toFixed(1)}</span>
              </div>
            </div>

            <div className="ins-panel ins-deck">
              <h3>Market & structure</h3>
              {(
                [
                  { key: 'F', label: 'Forward F', min: 50, max: 130, step: 1, fmt: (v: number) => `$${v.toFixed(0)}` },
                  { key: 'sigma', label: 'Vol σ', min: 0.1, max: 0.8, step: 0.01, fmt: (v: number) => `${(v * 100).toFixed(0)}%` },
                  { key: 'T', label: 'Maturity T', min: 0.1, max: 2, step: 0.05, fmt: (v: number) => `${v.toFixed(2)}y` },
                  { key: 'r', label: 'Rate r', min: 0, max: 0.08, step: 0.0025, fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
                ] as const
              ).map((m) => (
                <label key={m.key}>
                  <span className="ins-plabel">{m.label}</span>
                  <input
                    type="range"
                    min={m.min}
                    max={m.max}
                    step={m.step}
                    value={mkt[m.key]}
                    onChange={(e) => setM(m.key, Number(e.target.value))}
                  />
                  <span className="ins-pval">{m.fmt(mkt[m.key])}</span>
                </label>
              ))}
              <label data-tour="cap">
                <span className="ins-plabel">Cap strike Kc</span>
                <input
                  type="range"
                  min={Math.round(mkt.F)}
                  max={Math.round(mkt.F * 1.5)}
                  step={1}
                  value={capK}
                  onChange={(e) => setCapK(Number(e.target.value))}
                />
                <span className="ins-pval">${capK.toFixed(0)}</span>
              </label>
              <p className="ins-muted">
                Pick the cap; the solver finds the floor whose written put
                exactly finances the purchased call.
              </p>
            </div>

            <div className="ins-main">
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
                  <button className="ins-bookbtn" onClick={bookCollar}>Book collar</button>
                  {booked && <span className="ins-bookflash">✓ {booked}</span>}
                </div>
              </div>

              <figure className="ins-panel ins-plot">
                <h3>Effective purchase cost at expiry</h3>
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${CW} ${CH}`}
                  role="img"
                  aria-label="Effective purchase cost by strategy"
                  onMouseMove={onMove}
                  onMouseLeave={() => setHoverS(null)}
                >
                  {/* collar band */}
                  <rect
                    x={PAD.left}
                    y={y(collar.capK)}
                    width={CW - PAD.left - PAD.right}
                    height={Math.max(0, y(collar.floorK) - y(collar.capK))}
                    fill={C_COLLAR}
                    opacity={0.07}
                  />
                  {/* grid */}
                  {[0.6, 0.8, 1.0, 1.2, 1.4, 1.6].map((f) => (
                    <g key={f}>
                      <line x1={x(f * mkt.F)} y1={PAD.top} x2={x(f * mkt.F)} y2={CH - PAD.bottom} stroke="var(--line)" strokeWidth={1} />
                      <text x={x(f * mkt.F)} y={CH - PAD.bottom + 16} textAnchor="middle" className="tick">
                        {(f * mkt.F).toFixed(0)}
                      </text>
                    </g>
                  ))}
                  {[collar.floorK, mkt.F, collar.capK].map((v, i) => (
                    <text key={i} x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="tick">
                      {v.toFixed(0)}
                    </text>
                  ))}
                  <text x={(PAD.left + CW - PAD.right) / 2} y={CH - 4} textAnchor="middle" className="axis-title">
                    terminal price S_T →
                  </text>

                  {/* series */}
                  <path d={line('unhedged')} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="5 4" />
                  <path d={line('forward')} fill="none" stroke={C_FWD} strokeWidth={2} />
                  <path d={line('collar')} fill="none" stroke={C_COLLAR} strokeWidth={2.5} />
                  <text x={CW - PAD.right + 6} y={y(samples[N].collar) + 4} className="series-label" fill={C_COLLAR}>
                    collar
                  </text>
                  <text x={CW - PAD.right + 6} y={y(samples[N].forward) + 4} className="series-label" fill={C_FWD}>
                    forward
                  </text>
                  <text x={CW - PAD.right + 6} y={y(Math.min(samples[N].unhedged, yMax)) + 4} className="series-label" fill="var(--muted)">
                    unhedged
                  </text>

                  {hoverPt && (
                    <>
                      <line x1={x(hoverPt.s)} y1={PAD.top} x2={x(hoverPt.s)} y2={CH - PAD.bottom} stroke="var(--muted)" strokeWidth={1} opacity={0.5} />
                      <circle cx={x(hoverPt.s)} cy={y(hoverPt.collar)} r={4} fill={C_COLLAR} stroke="var(--panel)" strokeWidth={2} />
                      <circle cx={x(hoverPt.s)} cy={y(hoverPt.forward)} r={4} fill={C_FWD} stroke="var(--panel)" strokeWidth={2} />
                    </>
                  )}
                </svg>
                {hoverPt && (
                  <div className="ins-tooltip" style={{ left: `${(x(hoverPt.s) / CW) * 100}%` }}>
                    S_T ${hoverPt.s.toFixed(1)} · collar ${hoverPt.collar.toFixed(1)} · forward $
                    {hoverPt.forward.toFixed(1)} · unhedged ${hoverPt.unhedged.toFixed(1)}
                  </div>
                )}
                <figcaption className="ins-legend">
                  <span className="lg-item">
                    <span className="dot" style={{ background: C_COLLAR }} /> Zero-cost collar
                  </span>
                  <span className="lg-item">
                    <span className="dot" style={{ background: C_FWD }} /> Forward
                  </span>
                  <span className="lg-item">
                    <span className="dot dashed" /> Unhedged
                  </span>
                </figcaption>
              </figure>

              <div className="ins-panel">
                <h3>Strategy comparison</h3>
                <div className="ins-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Strategy</th>
                        <th className="num">Upfront premium</th>
                        <th className="num">Worst-case cost</th>
                        <th className="num">Best-case cost</th>
                        <th>What you give up</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Unhedged</td>
                        <td className="num">$0</td>
                        <td className="num">unbounded</td>
                        <td className="num">→ $0</td>
                        <td>nothing — you carry the whole tail</td>
                      </tr>
                      <tr>
                        <td>Forward</td>
                        <td className="num">$0</td>
                        <td className="num">${mkt.F.toFixed(1)}</td>
                        <td className="num">${mkt.F.toFixed(1)}</td>
                        <td>all downside participation</td>
                      </tr>
                      <tr className="hl">
                        <td>Zero-cost collar</td>
                        <td className="num">$0</td>
                        <td className="num">${collar.capK.toFixed(1)}</td>
                        <td className="num">${collar.floorK.toFixed(1)}</td>
                        <td>participation below ${collar.floorK.toFixed(1)}</td>
                      </tr>
                      <tr>
                        <td>Cap only (bought call)</td>
                        <td className="num">${capOnlyPremium.toFixed(2)}</td>
                        <td className="num">${(collar.capK + capOnlyPremium).toFixed(1)}</td>
                        <td className="num">→ premium only</td>
                        <td>the premium — paid in cash</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="ins-warning">
                "Zero cost" is not "no cost" — the written floor is short
                optionality, paid for in scenarios rather than cash. And when
                structurers add barriers to sweeten the strikes, a collar
                becomes knock-in/knock-out — the KIKO structures that devastated
                Korean SMEs in 2008. Barrier analytics for exactly that risk are
                the Exotic Desk's job (next tab).
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
