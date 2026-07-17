import { useState } from 'react'
import { Chip, useSpine } from '../state/spine'
import { timeAgo, useErp, type Designation } from '../state/erp'
import cfh from '../data/cfh_summary.json'
import { useLang, useT } from '../i18n'
import './Accounting.css'

// Precomputed from the CFH paper's own engine (cfh_data.json, Spec v3.1) —
// Structure A: one combined quanto CFH designation; Structure B: split
// WTI KO call + Garman-Kohlhagen FX call, two hedge lines.
const S = cfh.stats as {
  premium: number
  ineffA: number
  ineffB: number
  sigmaEconA: number
  sigmaEconB: number
  koProb: number
  ociReclassA: number
  postKoFvtplStdB: number
}
const SERIES = cfh.series as {
  t: number
  aOCI: number
  aCumIneff: number
  alive: number
  b1OCI: number
  b1CumIneff: number
}[]

const C_A = '#2f6db4'
const C_B = '#2e7d52'
const bn = (v: number) => `₩${(v / 1e9).toFixed(1)}bn`

// CSV export via the file API only — no library. Simple CSV: the blotter's
// terms/notional fields are plain strings with no commas, so no quoting needed.
function downloadCsv(filename: string, rows: string[][]) {
  const text = rows.map((r) => r.join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const CW = 620
const CH = 210
const PAD = { top: 14, right: 96, bottom: 32, left: 60 }

function Chart({
  a,
  b,
  fmt,
  labelA,
  labelB,
}: {
  a: number[]
  b: number[]
  fmt: (v: number) => string
  labelA: string
  labelB: string
}) {
  const all = [...a, ...b]
  const yMax = Math.max(...all) * 1.08
  const yMin = Math.min(0, ...all) * 1.08
  const x = (i: number) => PAD.left + (i / (SERIES.length - 1)) * (CW - PAD.left - PAD.right)
  const y = (v: number) => CH - PAD.bottom - ((v - yMin) / (yMax - yMin)) * (CH - PAD.top - PAD.bottom)
  const line = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} role="img">
      {[0, 0.5, 1].map((f) => {
        const v = yMin + f * (yMax - yMin)
        return (
          <g key={f}>
            <line x1={PAD.left} y1={y(v)} x2={CW - PAD.right} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
            <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" className="tick">{fmt(v)}</text>
          </g>
        )
      })}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <text key={f} x={x(f * (SERIES.length - 1))} y={CH - PAD.bottom + 16} textAnchor="middle" className="tick">
          {(SERIES[Math.round(f * (SERIES.length - 1))].t).toFixed(2)}y
        </text>
      ))}
      <path d={line(a)} fill="none" stroke={C_A} strokeWidth={2} />
      <path d={line(b)} fill="none" stroke={C_B} strokeWidth={2} />
      <text x={CW - PAD.right + 6} y={y(a[a.length - 1]) + 4} className="series-label" fill={C_A}>{labelA}</text>
      <text x={CW - PAD.right + 6} y={y(b[b.length - 1]) + 4} className="series-label" fill={C_B}>{labelB}</text>
    </svg>
  )
}

export default function Accounting() {
  const [view, setView] = useState<'oci' | 'ineff'>('ineff')
  const spine = useSpine()
  const { state: erp, dispatch, role } = useErp()
  const [lang] = useLang()
  const t = useT()
  const canDesignate = role === 'cfo'

  // ── CSV export via the file-API helper above; read-only, so every role may ──
  const exportTrades = () => {
    const rows: string[][] = [
      ['division', 'instrument', 'terms', 'notional', 'designation', 'booked'],
      ...erp.trades.map((t) => [t.division, t.instrument, t.terms, t.notional, t.designation, new Date(t.ts).toISOString()]),
    ]
    downloadCsv('blotter.csv', rows)
  }

  return (
    <div className="ac">
      <div className="spine-row" data-tour="chips">
        <Chip from="Exotic Desk">
          {lang === 'ko' ? (
            <>실시간 배리어 확률 <strong>{(spine.exoticKo * 100).toFixed(1)}%</strong> — B의 KO 이후 FVTPL 익스포저를 좌우</>
          ) : (
            <>live barrier odds <strong>{(spine.exoticKo * 100).toFixed(1)}%</strong> — drives B's post-KO FVTPL exposure</>
          )}
        </Chip>
        <Chip from="Budget">
          {spine.budgetRegime === 'american' ? t('American KO structure selected upstream') : t('European vanilla structure selected upstream')}
        </Chip>
      </div>
      <div className="ac-tiles">
        <div className="tile">
          <span className="tile-label">{t('Mean |ineffectiveness| — A combined')}</span>
          <span className="tile-value" style={{ color: C_A }}>{bn(S.ineffA)}</span>
        </div>
        <div className="tile">
          <span className="tile-label">{t('Mean |ineffectiveness| — B split')}</span>
          <span className="tile-value" style={{ color: C_B }}>{bn(S.ineffB)}</span>
          <span className="tile-badge">{t('3.7× cleaner in P&L')}</span>
        </div>
        <div className="tile">
          <span className="tile-label">{t('Economic σ — A vs B')}</span>
          <span className="tile-value small">{(S.sigmaEconA / 1e9).toFixed(1)} / {(S.sigmaEconB / 1e9).toFixed(1)} bn</span>
          <span className="tile-badge">{t('≈ same economics')}</span>
        </div>
        <div className="tile">
          <span className="tile-label">{t('KO probability (engine)')}</span>
          <span className="tile-value">{(S.koProb * 100).toFixed(1)}%</span>
        </div>
      </div>

      <div className="ac-cols">
      <div className="ac-col">
      <div className="ac-panel">
        <div className="ac-panelhead">
          <h3>{t('Trade blotter')} <span className="ac-count">{erp.trades.length}</span></h3>
          <button className="ac-export" title={t('Download the full blotter as CSV')} onClick={exportTrades}>
            {t('Export CSV')}
          </button>
        </div>
        <div className="ac-blotter">
          <table>
            <thead>
              <tr>
                <th>{t('Division')}</th>
                <th>{t('Instrument')}</th>
                <th>{t('Terms')}</th>
                <th className="num">{t('Notional')}</th>
                <th>{t('Booked')}</th>
                <th>{t('Designation')}</th>
              </tr>
            </thead>
            <tbody>
              {erp.trades.map((tr) => (
                <tr key={tr.id}>
                  <td>{erp.divisions.find((d) => d.id === tr.division)?.name}</td>
                  <td>{t(tr.instrument)}</td>
                  <td className="ac-terms">{tr.terms}</td>
                  <td className="num">{tr.notional}</td>
                  <td>{timeAgo(tr.ts)}</td>
                  <td>
                    <span title={!canDesignate ? t('Switch to the CFO role to designate') : undefined}>
                      <select
                        className={`ac-desig ac-desig-${tr.designation.toLowerCase().replace('-', '')}`}
                        value={tr.designation}
                        disabled={!canDesignate}
                        onChange={(e) => dispatch({ type: 'designate', id: tr.id, designation: e.target.value as Designation })}
                      >
                        <option value="CFH-A" title={t('Cash-flow hedge, combined designation')}>CFH-A</option>
                        <option value="CFH-B" title={t('Cash-flow hedge, split designation')}>CFH-B</option>
                        <option value="FVTPL">FVTPL</option>
                      </select>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="ac-note">
          {t("Book structures on the instrument desks and they land here; the designation choice decides which of the two ledger regimes below governs each trade's earnings path.")}
        </p>
      </div>

      <div className="ac-panel">
        <h3>{t('The designation trade-off')}</h3>
        <p className="ac-banner-inline">
          {lang === 'ko' ? (
            <>
              IFRS 9가 던지는 질문: 퀀토를{' '}
              <strong>하나의 통합 헤지 (A)</strong>로 지정할 것인가, 아니면{' '}
              <strong>두 개의 라인 (B)</strong>으로 분리할 것인가? 경제적 실질은 같아도 장부는 크게 달라집니다.
            </>
          ) : (
            <>
              The question IFRS 9 forces: designate the quanto as{' '}
              <strong>one combined hedge (A)</strong> or <strong>split it into
              two lines (B)</strong>? Same economics — very different books.
            </>
          )}
        </p>
        <table>
          <thead>
            <tr><th></th><th>{t('A — combined')}</th><th>{t('B — split')}</th></tr>
          </thead>
          <tbody>
            <tr><td>{t('Hedge lines to document')}</td><td>1</td><td>2 (WTI + FX)</td></tr>
            <tr><td>{t('Mean |ineffectiveness|')}</td><td>{bn(S.ineffA)}</td><td><strong>{bn(S.ineffB)}</strong></td></tr>
            <tr><td>{t('Economic cash-flow σ')}</td><td>{bn(S.sigmaEconA)}</td><td>{bn(S.sigmaEconB)}</td></tr>
            <tr><td>{t('OCI → P&L reclass at maturity')}</td><td>{bn(S.ociReclassA)}</td><td>—</td></tr>
            <tr><td>{t('Post-KO FVTPL noise (σ)')}</td><td>—</td><td>{bn(S.postKoFvtplStdB)}</td></tr>
          </tbody>
        </table>
        <p className="ac-note">
          {lang === 'ko' ? (
            <>
              경제적 실질은 거의 같아도 회계 결과는 다릅니다. 분리(B)는 손익에 잡히는
              비유효 부분을 3.7배 줄이지만, KO 레그가 녹아웃되면(확률{' '}
              {(S.koProb * 100).toFixed(0)}%) 대체 딜이 FVTPL로 분류되어{' '}
              {bn(S.postKoFvtplStdB)} 규모의 손익 노이즈가 생깁니다. 지정은 서류
              작업이 아니라 리스크에 관한 의사결정입니다.
            </>
          ) : (
            <>
              The economics barely differ; the accounting does. Splitting (B)
              cuts P&L ineffectiveness 3.7×, but if the KO leg dies (
              {(S.koProb * 100).toFixed(0)}% probability), its replacement
              trades at FVTPL and injects {bn(S.postKoFvtplStdB)} of earnings
              noise. Designation is a risk decision, not paperwork.
            </>
          )}
        </p>
      </div>
      </div>

      <div className="ac-col">
      <figure className="ac-panel">
        <div className="ac-head">
          <h3>{view === 'ineff' ? t('Cumulative ineffectiveness charged to P&L') : t('OCI hedge reserve path')}</h3>
          <div className="ac-toggle">
            <button className={view === 'ineff' ? 'active' : ''} onClick={() => setView('ineff')}>{t('P&L ineffectiveness')}</button>
            <button className={view === 'oci' ? 'active' : ''} onClick={() => setView('oci')}>{t('OCI reserve')}</button>
          </div>
        </div>
        {view === 'ineff' ? (
          <Chart
            a={SERIES.map((r) => r.aCumIneff)}
            b={SERIES.map((r) => r.b1CumIneff)}
            fmt={bn}
            labelA={t('A combined')}
            labelB={t('B split (WTI)')}
          />
        ) : (
          <Chart
            a={SERIES.map((r) => r.aOCI)}
            b={SERIES.map((r) => r.b1OCI)}
            fmt={bn}
            labelA={t('A combined')}
            labelB={t('B split (WTI)')}
          />
        )}
        <figcaption className="ac-legend">
          <span className="lg-item"><span className="dot" style={{ background: C_A }} /> {t('Structure A — one combined quanto CFH line')}</span>
          <span className="lg-item"><span className="dot" style={{ background: C_B }} /> {t('Structure B — split WTI leg (of two lines)')}</span>
        </figcaption>
      </figure>

      <div className="ac-panel">
        <h3>{t('Where this connects')}</h3>
        <ul className="ac-links">
          {lang === 'ko' ? (
            <>
              <li>
                <strong>Hedge Instruments →</strong> 칼라의 정렬된 시간가치는 IFRS 9에서
                OCI로 들어갑니다. 실무 데스크가 실제로 쓰는 지정 방식 그대로입니다.
              </li>
              <li>
                <strong>Exotic Desk →</strong> B의 녹아웃 이후 FVTPL 노이즈를 좌우하는 KO
                확률은 배리어 리스크 모니터에서 온 숫자입니다.
              </li>
              <li>
                <strong>Decision Dashboard →</strong> 헤지회계 채택 여부는 ESG 논문의
                결과 변수입니다. 공시 의무 효과의 정밀 null 추정도 바로 이 지정 선택
                위에서 측정됩니다.
              </li>
            </>
          ) : (
            <>
              <li>
                <strong>Hedge Instruments →</strong> a collar's aligned time value
                goes to OCI under IFRS 9: the same designation machinery the
                instrument desks actually use.
              </li>
              <li>
                <strong>Exotic Desk →</strong> the KO probability driving B's
                post-knock-out FVTPL noise is the Barrier Risk Monitor's number.
              </li>
              <li>
                <strong>Decision Dashboard →</strong> hedge-accounting adoption is
                the ESG paper's outcome variable: the precisely-estimated null on
                disclosure mandates was measured on exactly this designation
                choice.
              </li>
            </>
          )}
        </ul>
      </div>
      </div>
      </div>
    </div>
  )
}
