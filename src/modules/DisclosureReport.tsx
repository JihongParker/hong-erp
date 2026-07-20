import { useMemo } from 'react'
import { useErp } from '../state/erp'
import { useSpine } from '../state/spine'
import { IRO_ITEMS, PILLAR_LABELS } from '../data/iro'
import { TAXONOMY, type Datapoint } from '../data/taxonomy'
import { useT, useLang } from '../i18n'
import './DisclosureReport.css'

// Read-only disclosure draft — the ESG ERP's actual output. Nothing here is
// computed fresh: every figure is transcribed from the ERP ledgers (erp.tsx)
// and the decision spine (spine.tsx), then reassembled into the ISSB/KSSB
// four-pillar structure (Governance · Strategy · Risk management · Metrics &
// targets). Print / Save as PDF renders the same document to paper via the
// @media print rules in DisclosureReport.css.

// Framework labels + chip rendering reused from AccountTree so a metric's
// datapoint code lights up the same GRI/KSSB/KCGS/MSCI mapping it does there.
const FRAMEWORK_LABELS = {
  gri: 'GRI',
  kssb: 'KSSB',
  kcgs: 'KCGS',
  msci: 'MSCI',
} as const

// flatten the taxonomy to a code → datapoint index once (module-level constant)
const DP_BY_CODE: Map<string, Datapoint> = (() => {
  const m = new Map<string, Datapoint>()
  for (const p of TAXONOMY)
    for (const c of p.categories)
      for (const a of c.accounts) for (const d of a.datapoints) m.set(d.code, d)
  return m
})()

function FrameworkChips({ code }: { code: string }) {
  const t = useT()
  const dp = DP_BY_CODE.get(code)
  const keys = Object.keys(FRAMEWORK_LABELS) as Array<keyof typeof FRAMEWORK_LABELS>
  const chips = dp
    ? keys.filter((k) => dp.frameworks[k])
    : []
  if (chips.length === 0) return <span className="dr-nomap">{t('unmapped')}</span>
  return (
    <div className="fw-chips">
      {chips.map((k) => (
        <span key={k} className={`fw-chip fw-${k}`}>
          {FRAMEWORK_LABELS[k]} {dp!.frameworks[k]}
        </span>
      ))}
    </div>
  )
}

const DESIGNATIONS = ['CFH-A', 'CFH-B', 'FVTPL'] as const
const DESIGNATION_NOTE: Record<(typeof DESIGNATIONS)[number], string> = {
  'CFH-A': 'cash-flow hedge, combined',
  'CFH-B': 'cash-flow hedge, split',
  FVTPL: 'fair value through P&L',
}

export default function DisclosureReport() {
  const { state } = useErp()
  const spine = useSpine()
  const t = useT()
  const [lang] = useLang()
  const { divisions, metrics, trades, events } = state

  const divName = (id: string) => divisions.find((d) => d.id === id)?.name ?? id

  // Pillar 1 — Governance: the approval workflow's own track record
  const approved = useMemo(() => metrics.filter((m) => m.status === 'approved'), [metrics])
  const rejected = metrics.filter((m) => m.status === 'rejected')
  const pending = metrics.filter((m) => m.status === 'pending')
  const reviewEvents = events.filter((e) => e.action === 'approved' || e.action === 'rejected')

  // Pillar 2 — Strategy: recompute material issues from the spine threshold,
  // exactly as Materiality does (union reading of double materiality)
  const threshold = spine.materialityThreshold
  const material = useMemo(
    () => IRO_ITEMS.filter((i) => i.financial >= threshold || i.impact >= threshold),
    [threshold],
  )
  const topMaterial = useMemo(
    () =>
      [...material]
        .sort((a, b) => Math.max(b.financial, b.impact) - Math.max(a.financial, a.impact))
        .slice(0, 5),
    [material],
  )

  // Pillar 3 — Risk management: hedge book aggregated by instrument, and the
  // IFRS 9 designation mix
  const byInstrument = useMemo(() => {
    const m = new Map<string, { count: number; notionals: string[] }>()
    for (const t of trades) {
      const e = m.get(t.instrument) ?? { count: 0, notionals: [] }
      e.count += 1
      e.notionals.push(t.notional)
      m.set(t.instrument, e)
    }
    return [...m.entries()]
  }, [trades])
  const byDesignation = DESIGNATIONS.map((d) => ({
    d,
    n: trades.filter((t) => t.designation === d).length,
  }))

  // Pillar 4 — Metrics & targets: approved metrics only, most recent first
  const approvedSorted = useMemo(
    () => [...approved].sort((a, b) => b.ts - a.ts),
    [approved],
  )

  const today = new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="dr">
      <div className="dr-doc">
        <header className="dr-header">
          <div className="dr-title-row">
            <div>
              <h1 className="dr-title">{t('Climate & Sustainability Disclosure — Draft')}</h1>
              <p className="dr-entity">{t('HongERP Demo Corp, integrated refiner')}</p>
            </div>
            <button className="dr-print" onClick={() => window.print()}>
              {t('Print / Save as PDF')}
            </button>
          </div>
          <p className="dr-subtitle">
            {t('Prepared on the ISSB/KSSB four-pillar structure · demo document assembled live from the ERP ledgers')}
          </p>
          <p className="dr-meta">{lang === 'ko' ? `생성일 ${today}` : `Generated ${today}`}</p>
        </header>

        {/* 1. Governance */}
        <section className="dr-section">
          <h2 className="dr-h2">
            <span className="dr-num">1.</span> {t('Governance')}
          </h2>
          <p className="dr-lead">
            {t('Sustainability data reaches this report only through a segregated approval workflow. Submission, review, booking and designation are held in four separate hands: division heads submit metrics, Audit (J. Kim) approves or rejects them, the Treasury desk books hedges, and the CFO office designates them. No single actor can both file a figure and sign it off.')}
          </p>
          <div className="dr-stat-row">
            <div className="dr-stat">
              <span className="dr-stat-val">{approved.length}</span>
              <span className="dr-stat-lbl">{t('Metrics approved')}</span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat-val">{rejected.length}</span>
              <span className="dr-stat-lbl">{t('Rejected on review')}</span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat-val">{pending.length}</span>
              <span className="dr-stat-lbl">{t('Awaiting review')}</span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat-val">{reviewEvents.length}</span>
              <span className="dr-stat-lbl">{t('Review events logged')}</span>
            </div>
          </div>
          <p className="dr-body">
            {lang === 'ko' ? (
              <>
                기록상 검토 책임자는 <strong>J. Kim (감사팀)</strong>이다. 모든 상신·승인·반려·체결·지정은
                한 번 쓰면 지울 수 없는 감사 추적에 남으며, 최근 이벤트 {events.length}건이 실시간 원장에
                보존된다.
              </>
            ) : (
              <>
                The reviewing officer of record is <strong>J. Kim (audit)</strong>.
                Every submission, approval, rejection, booking and designation is
                written to an append-only audit trail; {events.length} of the most
                recent events are retained in the live ledger.
              </>
            )}
          </p>
        </section>

        {/* 2. Strategy */}
        <section className="dr-section">
          <h2 className="dr-h2">
            <span className="dr-num">2.</span> {t('Strategy')}
          </h2>
          <p className="dr-lead">
            {lang === 'ko' ? (
              <>
                전략은 이중 중대성 평가에서 출발한다. 재무 점수와 영향 점수 중 하나라도 중대성 기준선{' '}
                <strong>{threshold.toFixed(1)}</strong>(1–5 척도)을 넘으면 중대 항목으로 판정된다. 그 기준으로
                IRO 등록부{' '}
                <strong>
                  {IRO_ITEMS.length}개 중 {material.length}개
                </strong>{' '}
                이슈가 중대 항목이다.
              </>
            ) : (
              <>
                Strategy is anchored to a double-materiality assessment. An issue is
                judged material when either its financial or its impact score clears
                the materiality threshold of <strong>{threshold.toFixed(1)}</strong>{' '}
                (on a 1–5 scale). On that basis{' '}
                <strong>
                  {material.length} of {IRO_ITEMS.length}
                </strong>{' '}
                issues in the IRO register are material.
              </>
            )}
          </p>
          <ol className="dr-material-list">
            {topMaterial.map((i) => (
              <li key={i.id}>
                <span className="dr-mat-name">{t(i.name)}</span>
                <span className="dr-mat-meta">
                  {t(PILLAR_LABELS[i.pillar])} · {t('financial')} {i.financial.toFixed(1)} ·
                  {' '}{t('impact')} {i.impact.toFixed(1)}
                </span>
              </li>
            ))}
          </ol>
          <p className="dr-body">
            {lang === 'ko' ? (
              <>
                중대 리스크는 설문 점수에 머물지 않는다. 의사결정 레이어에 익스포저 파라미터로 투입되어
                목표 공시 강도 d*를 정한다(현재 <strong>{spine.dStar.toFixed(2)}</strong>). 공시와 헤지는
                하나의 문제로 함께 풀리므로, 공시 요구가 강해질수록 최적 헤지비율도 그에 맞춰 움직인다.
              </>
            ) : (
              <>
                Material risks are not left as survey scores: they feed the decision
                layer as exposure parameters, which sets the target disclosure
                intensity <strong>d* = {spine.dStar.toFixed(2)}</strong>. Disclosure
                and hedging are solved jointly: the more the firm is required to
                disclose, the more its optimal hedge ratios move with it.
              </>
            )}
          </p>
        </section>

        {/* 3. Risk management */}
        <section className="dr-section">
          <h2 className="dr-h2">
            <span className="dr-num">3.</span> {t('Risk management')}
          </h2>
          <p className="dr-lead">
            {lang === 'ko' ? (
              <>
                수입 대금에 실린 상품·통화 가격 리스크는 라이브 구조 {trades.length}개로 이루어진 헤지
                북으로 관리된다. 자금부 데스크가 체결하고 CFO 오피스가 IFRS 9에 따라 지정한다.
              </>
            ) : (
              <>
                Commodity- and currency-price risk on the import bill is managed
                through a hedge book of {trades.length} live structures, booked by
                the Treasury desk and designated by the CFO office under IFRS 9.
              </>
            )}
          </p>

          <h3 className="dr-h3">{t('Hedge book by instrument')}</h3>
          <div className="dr-table-wrap">
            <table className="dr-table">
              <thead>
                <tr>
                  <th>{t('Instrument')}</th>
                  <th className="num">{t('Trades')}</th>
                  <th>{t('Notional')}</th>
                </tr>
              </thead>
              <tbody>
                {byInstrument.map(([inst, e]) => (
                  <tr key={inst}>
                    <td>{inst}</td>
                    <td className="num">{e.count}</td>
                    <td>{e.notionals.join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="dr-h3">{t('IFRS 9 designation mix')}</h3>
          <div className="dr-chip-row">
            {byDesignation.map(({ d, n }) => (
              <span key={d} className="dr-desig">
                <strong>{d}</strong> {t(DESIGNATION_NOTE[d])} · {n}
              </span>
            ))}
          </div>

          <h3 className="dr-h3">{t('Barrier & budget')}</h3>
          <div className="dr-stat-row">
            <div className="dr-stat">
              <span className="dr-stat-val">{(spine.exoticKo * 100).toFixed(1)}%</span>
              <span className="dr-stat-lbl">{t('Knock-out probability')}</span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat-val">${spine.exoticSpot.toFixed(2)}</span>
              <span className="dr-stat-lbl">{t('WTI reference spot')}</span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat-val">{(spine.budgetW1 * 100).toFixed(1)}%</span>
              <span className="dr-stat-lbl">{t('Budget → WTI')}</span>
            </div>
            <div className="dr-stat">
              <span className="dr-stat-val">{(spine.budgetW2 * 100).toFixed(1)}%</span>
              <span className="dr-stat-lbl">{t('Budget → FX')}</span>
            </div>
          </div>
          <p className="dr-body">
            {lang === 'ko' ? (
              <>
                배리어 구조의 실시간 녹아웃 확률은 WTI 기준 스팟 <strong>${spine.exoticSpot.toFixed(2)}</strong>에서{' '}
                <strong>{(spine.exoticKo * 100).toFixed(1)}%</strong>로 산출된다. 배리어가 발동되면 해당
                레그는 당기손익-공정가치(FVTPL)로 재분류된다. 고정 헤지 예산은 WTI/FX 커버리지에{' '}
                <strong>
                  {(spine.budgetW1 * 100).toFixed(1)}% / {(spine.budgetW2 * 100).toFixed(1)}%
                </strong>{' '}
                로 배분된다.
              </>
            ) : (
              <>
                The barrier structures carry a live knock-out probability of{' '}
                <strong>{(spine.exoticKo * 100).toFixed(1)}%</strong> at a WTI
                reference spot of <strong>${spine.exoticSpot.toFixed(2)}</strong>;
                past the barrier a knocked-out leg reverts to fair value through P&amp;L.
                The fixed hedge budget is allocated{' '}
                <strong>
                  {(spine.budgetW1 * 100).toFixed(1)}% / {(spine.budgetW2 * 100).toFixed(1)}%
                </strong>{' '}
                across WTI and FX coverage.
              </>
            )}
          </p>
        </section>

        {/* 4. Metrics & targets */}
        <section className="dr-section">
          <h2 className="dr-h2">
            <span className="dr-num">4.</span> {t('Metrics & targets')}
          </h2>
          <p className="dr-lead">
            {lang === 'ko' ? (
              <>
                아래 정량 공시에는 검토를 통과한 지표 {approvedSorted.length}개를 최신순으로 담았다. 각
                지표에는 데이터포인트 코드에 연결된 GRI · KSSB · KCGS · MSCI 프레임워크 매핑을 함께 표기한다.
              </>
            ) : (
              <>
                The quantitative disclosures below are the {approvedSorted.length}{' '}
                metrics that have cleared review, most recent first. Each carries the
                framework mapping of its datapoint code across GRI, KSSB, KCGS and
                MSCI.
              </>
            )}
          </p>
          <div className="dr-table-wrap">
            <table className="dr-table">
              <thead>
                <tr>
                  <th>{t('Division')}</th>
                  <th>{t('Code')}</th>
                  <th>{t('Datapoint')}</th>
                  <th className="num">FY</th>
                  <th className="num">{t('Value')}</th>
                  <th>{t('Framework mapping')}</th>
                </tr>
              </thead>
              <tbody>
                {approvedSorted.map((m) => (
                  <tr key={m.id}>
                    <td>{divName(m.division)}</td>
                    <td>
                      <code>{m.datapoint}</code>
                    </td>
                    <td>{m.name}</td>
                    <td className="num">{m.year}</td>
                    <td className="num">
                      {m.value.toLocaleString()} <span className="dr-unit">{t(m.unit)}</span>
                    </td>
                    <td>
                      <FrameworkChips code={m.datapoint} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="dr-footer">
          {t('Draft assembled from live ERP state: figures are demo data; engines are frozen paper transcriptions.')}
        </footer>
      </div>
    </div>
  )
}
