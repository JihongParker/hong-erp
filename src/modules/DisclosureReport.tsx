import { useMemo } from 'react'
import { useErp } from '../state/erp'
import { useSpine } from '../state/spine'
import { IRO_ITEMS, PILLAR_LABELS } from '../data/iro'
import { TAXONOMY, type Datapoint } from '../data/taxonomy'
import { useT, useLang } from '../i18n'
import './DisclosureReport.css'

// Read-only disclosure draft — the ESG ERP's actual output. Nothing here is
// computed fresh: every figure is transcribed from the ERP ledgers (erp.tsx)
// and the decision spine (spine.tsx). The guide language also picks the
// filing form the draft is typeset in:
//   en → SEC Form 10-K (cover, table of contents, Part/Item numbering,
//        rule-only tables, signatures)
//   ko → DART 사업보고서 (표지, 목차, 로마숫자 장, 전체 괘선 표, 작성책임자)
// The ISSB/KSSB four pillars (Governance · Strategy · Risk management ·
// Metrics & targets) are mapped onto the Items / 장 of each form. Print / Save
// as PDF renders the same document to paper via the @media print rules in
// DisclosureReport.css.

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

function FrameworkRefs({ code }: { code: string }) {
  const t = useT()
  const dp = DP_BY_CODE.get(code)
  const keys = Object.keys(FRAMEWORK_LABELS) as Array<keyof typeof FRAMEWORK_LABELS>
  const refs = dp ? keys.filter((k) => dp.frameworks[k]) : []
  if (refs.length === 0) return <span className="dr-nomap">{t('unmapped')}</span>
  return <>{refs.map((k) => `${FRAMEWORK_LABELS[k]} ${dp!.frameworks[k]}`).join('; ')}</>
}

const DESIGNATIONS = ['CFH-A', 'CFH-B', 'FVTPL'] as const
const DESIGNATION_NOTE: Record<(typeof DESIGNATIONS)[number], { en: string; ko: string }> = {
  'CFH-A': { en: 'Cash-flow hedge, combined exposure', ko: '현금흐름위험회피(결합 노출)' },
  'CFH-B': { en: 'Cash-flow hedge, split exposure', ko: '현금흐름위험회피(분리 노출)' },
  FVTPL: { en: 'Fair value through profit or loss', ko: '당기손익-공정가치 측정' },
}

// Section spine shared by both forms. `tenk` is the 10-K Item label, `dart`
// the 사업보고서 장 label; the body of each section is rendered once.
const SECTIONS = [
  { id: 'business', tenk: 'Item 1.', tenkTitle: 'Business', dart: 'I.', dartTitle: '회사의 개요' },
  { id: 'risk', tenk: 'Item 1A.', tenkTitle: 'Risk Factors', dart: 'II.', dartTitle: '사업의 내용' },
  { id: 'mdna', tenk: 'Item 7.', tenkTitle: "Management's Discussion and Analysis", dart: 'III.', dartTitle: '이사의 경영진단 및 분석의견' },
  { id: 'market', tenk: 'Item 7A.', tenkTitle: 'Quantitative and Qualitative Disclosures About Market Risk', dart: 'IV.', dartTitle: '재무에 관한 사항 — 파생상품 및 위험관리' },
  { id: 'controls', tenk: 'Item 9A.', tenkTitle: 'Controls and Procedures', dart: 'V.', dartTitle: '내부통제 및 감사에 관한 사항' },
  { id: 'metrics', tenk: 'Item 15.', tenkTitle: 'Exhibits — Sustainability Metrics (ISSB S2)', dart: 'VI.', dartTitle: '지속가능성 관련 공시 지표 (KSSB 제2호)' },
] as const

const PART_OF: Record<string, string> = { business: 'PART I', risk: 'PART I', mdna: 'PART II', market: 'PART II', controls: 'PART II', metrics: 'PART IV' }

export default function DisclosureReport() {
  const { state } = useErp()
  const spine = useSpine()
  const t = useT()
  const [lang] = useLang()
  const ko = lang === 'ko'
  const { divisions, metrics, trades, events } = state

  const divName = (id: string) => divisions.find((d) => d.id === id)?.name ?? id

  // Governance: the approval workflow's own track record
  const approved = useMemo(() => metrics.filter((m) => m.status === 'approved'), [metrics])
  const rejected = metrics.filter((m) => m.status === 'rejected')
  const pending = metrics.filter((m) => m.status === 'pending')
  const reviewEvents = events.filter((e) => e.action === 'approved' || e.action === 'rejected')

  // Strategy: material issues from the spine threshold (union reading)
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

  // Risk management: hedge book by instrument and the IFRS 9 designation mix
  const byInstrument = useMemo(() => {
    const m = new Map<string, { count: number; notionals: string[] }>()
    for (const tr of trades) {
      const e = m.get(tr.instrument) ?? { count: 0, notionals: [] }
      e.count += 1
      e.notionals.push(tr.notional)
      m.set(tr.instrument, e)
    }
    return [...m.entries()]
  }, [trades])
  const byDesignation = DESIGNATIONS.map((d) => ({
    d,
    n: trades.filter((tr) => tr.designation === d).length,
  }))

  // Metrics & targets: approved metrics only, most recent first
  const approvedSorted = useMemo(() => [...approved].sort((a, b) => b.ts - a.ts), [approved])

  const now = new Date()
  const fy = now.getFullYear()
  const term = fy - 2000 // 제 N 기: demo corp incorporated in 2000
  const today = now.toLocaleDateString(ko ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`

  const label = (s: (typeof SECTIONS)[number]) => (ko ? `${s.dart} ${s.dartTitle}` : `${s.tenk} ${s.tenkTitle}`)

  return (
    <div className="dr">
      <div className="dr-toolbar">
        <span className="dr-form-note">
          {ko ? 'DART 사업보고서 양식 · 언어를 영어로 바꾸면 SEC Form 10-K 양식' : 'SEC Form 10-K layout · switch the guide language to Korean for the DART 사업보고서 form'}
        </span>
        <button className="dr-print" onClick={() => window.print()}>
          {t('Print / Save as PDF')}
        </button>
      </div>

      <article className={`dr-filing ${ko ? 'dart' : 'tenk'}`}>
        {/* ---------------- cover ---------------- */}
        {ko ? (
          <section className="dr-page dr-cover">
            <p className="dr-cover-tag">※ 본 문서는 ERP 원장에서 생성한 시연용 초안으로, 실제 전자공시가 아닙니다.</p>
            <h1 className="dart-title">사 업 보 고 서</h1>
            <p className="dart-term">(제 {term} 기)</p>
            <table className="dart-cover-tbl">
              <tbody>
                <tr><th>사업연도</th><td>{fy}년 01월 01일 부터 {fy}년 12월 31일 까지</td></tr>
              </tbody>
            </table>
            <p className="dart-to">금융위원회<br />한국거래소 귀중</p>
            <table className="dart-cover-tbl">
              <tbody>
                <tr><th>제출일자</th><td>{today}</td></tr>
                <tr><th>회 사 명</th><td>홍이알피 데모 주식회사 (HongERP Demo Corp)</td></tr>
                <tr><th>대표이사</th><td>홍 지 훈 (가상)</td></tr>
                <tr><th>본점 소재지</th><td>서울특별시 (시연용 가상 주소)</td></tr>
                <tr><th>작성책임자</th><td>재무부문 CFO 오피스 · 검토 책임자 감사팀 J. Kim</td></tr>
                <tr><th>제출대상법인 유형</th><td>주권상장법인 (시연)</td></tr>
                <tr><th>작성 기준</th><td>KSSB 제1호·제2호(ISSB S1·S2 대응), K-IFRS 제1109호 위험회피회계</td></tr>
              </tbody>
            </table>
          </section>
        ) : (
          <section className="dr-page dr-cover">
            <p className="tenk-sec">UNITED STATES<br />SECURITIES AND EXCHANGE COMMISSION<br />Washington, D.C. 20549</p>
            <h1 className="tenk-form">FORM 10-K</h1>
            <p className="tenk-check">☒ ANNUAL REPORT PURSUANT TO SECTION 13 OR 15(d) OF THE SECURITIES EXCHANGE ACT OF 1934</p>
            <p className="tenk-center">For the fiscal year ended December 31, {fy}</p>
            <p className="tenk-check">☐ TRANSITION REPORT PURSUANT TO SECTION 13 OR 15(d) OF THE SECURITIES EXCHANGE ACT OF 1934</p>
            <p className="tenk-center">Commission File Number 000-00000 (demonstration)</p>
            <hr className="tenk-rule" />
            <h2 className="tenk-registrant">HONGERP DEMO CORP</h2>
            <p className="tenk-caption">(Exact name of registrant as specified in its charter)</p>
            <table className="tenk-cover-tbl">
              <tbody>
                <tr>
                  <td>Delaware (demonstration)</td>
                  <td>00-0000000</td>
                </tr>
                <tr className="cap">
                  <td>(State or other jurisdiction of incorporation or organization)</td>
                  <td>(I.R.S. Employer Identification No.)</td>
                </tr>
              </tbody>
            </table>
            <p className="tenk-center">Seoul, Republic of Korea — integrated refiner (demonstration address)</p>
            <p className="tenk-caption">(Address of principal executive offices)</p>
            <hr className="tenk-rule" />
            <p className="tenk-left"><b>Securities registered pursuant to Section 12(b) of the Act:</b></p>
            <table className="tenk-cover-tbl grid">
              <thead>
                <tr><th>Title of each class</th><th>Trading symbol</th><th>Name of each exchange on which registered</th></tr>
              </thead>
              <tbody>
                <tr><td>Common stock, par value $0.01 per share</td><td>HERP</td><td>None — demonstration registrant</td></tr>
              </tbody>
            </table>
            <p className="tenk-left">Indicate by check mark whether the registrant is a large accelerated filer, an accelerated filer, a non-accelerated filer, a smaller reporting company, or an emerging growth company.</p>
            <p className="tenk-left tenk-boxes">Large accelerated filer ☐ &nbsp; Accelerated filer ☐ &nbsp; Non-accelerated filer ☒ &nbsp; Smaller reporting company ☐ &nbsp; Emerging growth company ☐</p>
            <p className="tenk-left"><b>DOCUMENTS INCORPORATED BY REFERENCE:</b> None. This draft is assembled live from the HongERP ledgers for demonstration; it has not been filed with the Commission.</p>
            <p className="dr-cover-tag">Prepared {today} on the ISSB/KSSB four-pillar structure (Governance · Strategy · Risk management · Metrics &amp; targets).</p>
          </section>
        )}

        {/* ---------------- table of contents ---------------- */}
        <section className="dr-page dr-toc">
          <h2 className="dr-toc-h">{ko ? '목  차' : 'TABLE OF CONTENTS'}</h2>
          <table className="dr-toc-tbl">
            <tbody>
              {SECTIONS.flatMap((s, i) => {
                const rows = []
                const newPart = !ko && (i === 0 || PART_OF[s.id] !== PART_OF[SECTIONS[i - 1].id])
                if (newPart) rows.push(<tr key={s.id + '-part'}><td colSpan={2} className="dr-toc-part">{PART_OF[s.id]}</td></tr>)
                rows.push(
                  <tr key={s.id}>
                    <td className="dr-toc-no">{ko ? s.dart : s.tenk}</td>
                    <td><a href={`#dr-${s.id}`}>{ko ? s.dartTitle : s.tenkTitle}</a></td>
                  </tr>,
                )
                return rows
              })}
              {!ko && (
                <tr><td className="dr-toc-no" /><td><a href="#dr-signatures">SIGNATURES</a></td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* ---------------- body ---------------- */}
        <section className="dr-page dr-body">
          {!ko && <h2 className="tenk-part">PART I</h2>}

          {/* Business / 회사의 개요 */}
          <h3 id="dr-business" className="dr-item">{label(SECTIONS[0])}</h3>
          {ko ? (
            <>
              <h4 className="dart-sub">1. 회사의 개요</h4>
              <table className="dart-grid kv">
                <tbody>
                  <tr><th>회사명</th><td>홍이알피 데모 주식회사 (HongERP Demo Corp)</td></tr>
                  <tr><th>업종</th><td>정유 (원유 수입·정제·판매, 통합 정유사)</td></tr>
                  <tr><th>주요 노출</th><td>WTI 원유 가격 및 원·달러 환율의 결합 노출 (수입 대금)</td></tr>
                  <tr><th>보고 체계</th><td>지배구조 · 전략 · 리스크 관리 · 지표 및 목표 (KSSB 4대 축)</td></tr>
                  <tr><th>원장 상태</th><td>사업부 {divisions.length}개 · 지표 {metrics.length}건 · 파생상품 {trades.length}건 · 감사 이벤트 {events.length}건</td></tr>
                </tbody>
              </table>
              <p>본 보고서의 모든 수치는 ERP 원장과 의사결정 계층에서 그대로 옮겨 적은 것이며, 보고서 작성 시점에 새로 계산한 값은 없다.</p>
            </>
          ) : (
            <>
              <p>HongERP Demo Corp (the "Company") is an integrated refiner that imports crude oil priced in U.S. dollars and sells refined products domestically. Its principal financial exposure is the combined position in WTI crude and the KRW/USD exchange rate carried on the import bill. This report is prepared on the ISSB/KSSB four-pillar structure — Governance, Strategy, Risk management, and Metrics and targets — and every figure below is transcribed from the Company's ERP ledgers and decision layer; nothing is computed fresh at the time of writing.</p>
              <table className="tenk-tbl">
                <tbody>
                  <tr><td>Operating divisions</td><td className="num">{divisions.length}</td></tr>
                  <tr><td>Sustainability metrics on ledger</td><td className="num">{metrics.length}</td></tr>
                  <tr><td>Derivative structures in the hedge book</td><td className="num">{trades.length}</td></tr>
                  <tr><td>Audit-trail events retained</td><td className="num">{events.length}</td></tr>
                </tbody>
              </table>
            </>
          )}

          {/* Risk Factors / 사업의 내용 */}
          <h3 id="dr-risk" className="dr-item">{label(SECTIONS[1])}</h3>
          {ko ? (
            <>
              <h4 className="dart-sub">1. 이중 중대성 평가</h4>
              <p>재무 점수와 영향 점수 중 하나라도 기준선 <b>{threshold.toFixed(1)}</b>(1~5점)을 넘으면 중대 이슈로 분류한다. IRO 등록부 {IRO_ITEMS.length}개 이슈 가운데 <b>{material.length}개</b>가 중대 이슈로 판정되었다.</p>
              <p className="dart-unit">(단위 : 점)</p>
              <table className="dart-grid">
                <thead><tr><th>순위</th><th>이슈</th><th>구분</th><th>재무 점수</th><th>영향 점수</th></tr></thead>
                <tbody>
                  {topMaterial.map((i, k) => (
                    <tr key={i.id}><td className="c">{k + 1}</td><td>{t(i.name)}</td><td className="c">{t(PILLAR_LABELS[i.pillar])}</td><td className="num">{i.financial.toFixed(1)}</td><td className="num">{i.impact.toFixed(1)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <>
              <p>The Company identifies its material sustainability-related risks through a double-materiality assessment. An issue is judged material when either its financial score or its impact score meets the materiality threshold of <b>{threshold.toFixed(1)}</b> on a 1–5 scale. On that basis <b>{material.length} of {IRO_ITEMS.length}</b> issues in the IRO register are material. The five highest-scoring are set out below.</p>
              <table className="tenk-tbl">
                <thead><tr><th>#</th><th>Risk factor</th><th>Pillar</th><th className="num">Financial</th><th className="num">Impact</th></tr></thead>
                <tbody>
                  {topMaterial.map((i, k) => (
                    <tr key={i.id}><td>{k + 1}</td><td>{i.name}</td><td>{PILLAR_LABELS[i.pillar]}</td><td className="num">{i.financial.toFixed(1)}</td><td className="num">{i.impact.toFixed(1)}</td></tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {!ko && <h2 className="tenk-part">PART II</h2>}

          {/* MD&A / 경영진단 */}
          <h3 id="dr-mdna" className="dr-item">{label(SECTIONS[2])}</h3>
          {ko ? (
            <>
              <h4 className="dart-sub">1. 공시 강도와 헤지의 연계</h4>
              <p>중대 이슈로 판정된 위험은 의사결정 계층의 관리 대상이 된다. 전사 목표 공시 강도는 현재 <b>d* = {spine.dStar.toFixed(2)}</b>이다. 모형에서 공시와 헤지는 한 문제의 두 답이므로, 공시 요구가 강해지면 최적 헤지비율도 함께 움직인다.</p>
              <h4 className="dart-sub">2. 헤지 예산 배분</h4>
              <table className="dart-grid kv">
                <tbody>
                  <tr><th>WTI 커버리지 배분</th><td className="num">{pct(spine.budgetW1)}</td></tr>
                  <tr><th>환율 커버리지 배분</th><td className="num">{pct(spine.budgetW2)}</td></tr>
                  <tr><th>목표 공시 강도 d*</th><td className="num">{spine.dStar.toFixed(2)}</td></tr>
                </tbody>
              </table>
            </>
          ) : (
            <>
              <p>Risks judged material become the risk register the decision layer manages. The firm-level target disclosure intensity currently stands at <b>d* = {spine.dStar.toFixed(2)}</b>. In the Company's model, disclosure and hedging are solved jointly: the more the Company is required to disclose, the more its optimal hedge ratios move with it. The fixed hedge budget is allocated <b>{pct(spine.budgetW1)}</b> to WTI coverage and <b>{pct(spine.budgetW2)}</b> to FX coverage.</p>
            </>
          )}

          {/* Market risk / 파생상품 */}
          <h3 id="dr-market" className="dr-item">{label(SECTIONS[3])}</h3>
          {ko ? (
            <>
              <p>수입 대금에서 발생하는 원자재·환율 리스크는 {trades.length}건의 파생상품으로 구성된 헤지 북으로 관리한다. 체결은 자금부 데스크가, K-IFRS 제1109호 회계 지정은 CFO 오피스가 맡는다.</p>
              <h4 className="dart-sub">1. 파생상품 거래 현황</h4>
              <p className="dart-unit">(단위 : 건)</p>
              <table className="dart-grid">
                <thead><tr><th>상품</th><th>건수</th><th>명목금액</th></tr></thead>
                <tbody>
                  {byInstrument.map(([inst, e]) => (
                    <tr key={inst}><td>{inst}</td><td className="num">{e.count}</td><td>{e.notionals.join(', ')}</td></tr>
                  ))}
                  <tr className="sum"><td>합계</td><td className="num">{trades.length}</td><td /></tr>
                </tbody>
              </table>
              <h4 className="dart-sub">2. 위험회피회계 지정 현황</h4>
              <table className="dart-grid">
                <thead><tr><th>지정 구분</th><th>내용</th><th>건수</th></tr></thead>
                <tbody>
                  {byDesignation.map(({ d, n }) => (
                    <tr key={d}><td className="c">{d}</td><td>{DESIGNATION_NOTE[d].ko}</td><td className="num">{n}</td></tr>
                  ))}
                </tbody>
              </table>
              <h4 className="dart-sub">3. 배리어 구조 및 민감도</h4>
              <table className="dart-grid kv">
                <tbody>
                  <tr><th>WTI 기준 현물가</th><td className="num">${spine.exoticSpot.toFixed(2)}</td></tr>
                  <tr><th>녹아웃 확률</th><td className="num">{pct(spine.exoticKo)}</td></tr>
                  <tr><th>배리어 발동 시 처리</th><td>해당 레그를 당기손익-공정가치(FVTPL)로 재분류</td></tr>
                </tbody>
              </table>
            </>
          ) : (
            <>
              <p>Commodity- and currency-price risk on the import bill is managed through a hedge book of {trades.length} live structures, booked by the Treasury desk and designated by the CFO office under IFRS 9.</p>
              <p className="tenk-sub">Hedge book by instrument</p>
              <table className="tenk-tbl">
                <thead><tr><th>Instrument</th><th className="num">Trades</th><th>Notional</th></tr></thead>
                <tbody>
                  {byInstrument.map(([inst, e]) => (
                    <tr key={inst}><td>{inst}</td><td className="num">{e.count}</td><td>{e.notionals.join(', ')}</td></tr>
                  ))}
                  <tr className="sum"><td>Total</td><td className="num">{trades.length}</td><td /></tr>
                </tbody>
              </table>
              <p className="tenk-sub">Hedge accounting designation (IFRS 9)</p>
              <table className="tenk-tbl">
                <thead><tr><th>Designation</th><th>Description</th><th className="num">Trades</th></tr></thead>
                <tbody>
                  {byDesignation.map(({ d, n }) => (
                    <tr key={d}><td>{d}</td><td>{DESIGNATION_NOTE[d].en}</td><td className="num">{n}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="tenk-sub">Barrier structures</p>
              <p>The barrier structures carry a live knock-out probability of <b>{pct(spine.exoticKo)}</b> at a WTI reference spot of <b>${spine.exoticSpot.toFixed(2)}</b>; past the barrier a knocked-out leg reverts to fair value through profit or loss.</p>
            </>
          )}

          {/* Controls / 내부통제 */}
          <h3 id="dr-controls" className="dr-item">{label(SECTIONS[4])}</h3>
          {ko ? (
            <>
              <p>지속가능성 데이터는 분리된 승인 절차를 거쳐야만 본 보고서에 반영된다. 상신, 검토, 체결, 지정은 네 주체가 나누어 맡는다. 사업부장이 지표를 상신하고, 감사팀(J. Kim)이 승인·반려하며, 자금부 데스크가 헤지를 체결하고, CFO 오피스가 회계 지정을 한다. 어느 한 사람도 수치를 올리고 동시에 승인할 수 없다.</p>
              <p className="dart-unit">(단위 : 건)</p>
              <table className="dart-grid">
                <thead><tr><th>승인 완료 지표</th><th>검토 반려</th><th>검토 대기</th><th>검토 이벤트 기록</th></tr></thead>
                <tbody>
                  <tr><td className="num">{approved.length}</td><td className="num">{rejected.length}</td><td className="num">{pending.length}</td><td className="num">{reviewEvents.length}</td></tr>
                </tbody>
              </table>
              <p>검토 책임자는 감사팀 <b>J. Kim</b>이다. 상신, 승인, 반려, 체결, 지정의 전 과정은 수정할 수 없는 감사 기록으로 남으며, 최근 이벤트 {events.length}건이 원장에 보존되어 있다.</p>
            </>
          ) : (
            <>
              <p>Sustainability data reaches this report only through a segregated approval workflow. Submission, review, booking and designation are held in four separate hands: division heads submit metrics, Audit (J. Kim) approves or rejects them, the Treasury desk books hedges, and the CFO office designates them. No single actor can both file a figure and sign it off.</p>
              <table className="tenk-tbl">
                <thead><tr><th>Control statistic</th><th className="num">Count</th></tr></thead>
                <tbody>
                  <tr><td>Metrics approved</td><td className="num">{approved.length}</td></tr>
                  <tr><td>Rejected on review</td><td className="num">{rejected.length}</td></tr>
                  <tr><td>Awaiting review</td><td className="num">{pending.length}</td></tr>
                  <tr><td>Review events logged</td><td className="num">{reviewEvents.length}</td></tr>
                </tbody>
              </table>
              <p>The reviewing officer of record is <b>J. Kim (audit)</b>. Every submission, approval, rejection, booking and designation is written to an append-only audit trail; {events.length} of the most recent events are retained in the live ledger.</p>
            </>
          )}

          {!ko && <h2 className="tenk-part">PART IV</h2>}

          {/* Metrics / 지표 */}
          <h3 id="dr-metrics" className="dr-item">{label(SECTIONS[5])}</h3>
          <p>
            {ko
              ? `아래 표는 검토를 통과한 정량 지표 ${approvedSorted.length}개를 최신순으로 정리한 것이다. 각 지표에는 해당 데이터포인트 코드의 GRI, KSSB, KCGS, MSCI 매핑을 함께 표기하였다.`
              : `The quantitative disclosures below are the ${approvedSorted.length} metrics that have cleared review, most recent first. Each carries the framework mapping of its datapoint code across GRI, KSSB, KCGS and MSCI.`}
          </p>
          <table className={ko ? 'dart-grid' : 'tenk-tbl'}>
            <thead>
              <tr>
                <th>{t('Division')}</th>
                <th>{t('Code')}</th>
                <th>{t('Datapoint')}</th>
                <th className="num">FY</th>
                <th className="num">{t('Value')}</th>
                <th>{ko ? '단위' : 'Unit'}</th>
                <th>{t('Framework mapping')}</th>
              </tr>
            </thead>
            <tbody>
              {approvedSorted.map((m) => (
                <tr key={m.id}>
                  <td>{divName(m.division)}</td>
                  <td className="code">{m.datapoint}</td>
                  <td>{m.name}</td>
                  <td className="num">{m.year}</td>
                  <td className="num">{m.value.toLocaleString()}</td>
                  <td>{t(m.unit)}</td>
                  <td className="refs"><FrameworkRefs code={m.datapoint} /></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Signatures / 확인 */}
          {ko ? (
            <>
              <h3 className="dr-item">작성책임자 확인</h3>
              <p>본 보고서는 ERP 원장과 의사결정 계층의 수치를 그대로 옮긴 시연용 초안이며, 수치는 시연 데이터이고 엔진은 논문을 동결한 사본이다.</p>
              <table className="dart-grid kv">
                <tbody>
                  <tr><th>작성책임자</th><td>재무부문 CFO 오피스</td></tr>
                  <tr><th>검토 책임자</th><td>감사팀 J. Kim</td></tr>
                  <tr><th>작성일</th><td>{today}</td></tr>
                </tbody>
              </table>
            </>
          ) : (
            <>
              <h2 id="dr-signatures" className="tenk-part">SIGNATURES</h2>
              <p>Pursuant to the requirements of Section 13 or 15(d) of the Securities Exchange Act of 1934, the registrant has duly caused this report to be signed on its behalf by the undersigned, thereunto duly authorized.</p>
              <table className="tenk-sig">
                <tbody>
                  <tr><td /><td>HONGERP DEMO CORP</td></tr>
                  <tr><td>Date: {today}</td><td>By: <span className="sigline">/s/ CFO Office</span><br /><span className="cap">Chief Financial Officer (demonstration signatory)</span></td></tr>
                  <tr><td /><td>Reviewed: <span className="sigline">/s/ J. Kim</span><br /><span className="cap">Audit — reviewing officer of record</span></td></tr>
                </tbody>
              </table>
              <p className="dr-cover-tag">Draft assembled from live ERP state: figures are demo data; engines are frozen paper transcriptions. Not filed with the Commission.</p>
            </>
          )}
        </section>
      </article>
    </div>
  )
}
