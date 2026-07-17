// Korean dictionary — reporting + validation layers (Chart of Accounts,
// Materiality, Metrics Entry, Scenario, Backtest, Audit trail, Disclosure
// report, Palette, Activity). Keys are the exact final English strings as they
// appear in the JSX. Merged into the master dictionary in i18n.ts. Numbers,
// currencies, chart ticks, taxonomy codes, datapoint formal names, framework
// names and model symbols stay English by principle.
export const KO_REPORTING: Record<string, string> = {
  // ── Chart of Accounts (AccountTree) ──
  'Search accounts & datapoints': '계정·데이터포인트 검색',
  'No results': '결과 없음',
  'Code': '코드',
  'Datapoint': '데이터포인트',
  'Unit': '단위',
  'Framework mapping': '프레임워크 매핑',
  'Demo taxonomy. Mappings are not validated for practice. The point is the structure: hierarchical codes mapped to multiple frameworks at the datapoint level.':
    '데모용 분류체계입니다. 매핑은 실무 검증을 거치지 않았습니다. 보여 드리려는 것은 구조 그 자체로, 계층형 계정 코드가 데이터포인트 단위에서 여러 프레임워크로 매핑되는 방식입니다.',
  'Select an account on the left': '왼쪽에서 계정 선택',

  // ── Materiality ──
  'Materiality threshold': '중대성 기준선',
  'Double materiality matrix': '이중 중대성 매트릭스',
  'Financial materiality →': '재무 중대성 →',
  'Impact materiality →': '영향 중대성 →',
  'Issue': '이슈',
  'Fin': '재무',
  'Imp': '영향',
  'Material': '중대',
  // pillar + IRO-type labels (also reused by the Disclosure report)
  'Environment': '환경',
  'Social': '사회',
  'Governance': '지배구조',
  'Risk': '리스크',
  'Opportunity': '기회',
  'Impact': '영향',
  // IRO register item names
  'Cost increase from carbon-pricing expansion': '탄소가격제 확대에 따른 비용 증가',
  'Climate disclosure mandate (KSSB S2) compliance': '기후 공시 의무(KSSB S2) 준수',
  'Demand growth for low-carbon product lines': '저탄소 제품군 수요 증가',
  'Flood & typhoon physical risk (coastal sites)': '홍수·태풍 물리적 리스크(해안 사업장)',
  'Operational disruption in water-stressed regions': '물 부족 지역 운영 중단',
  'Supply-chain human-rights due-diligence mandates': '공급망 인권 실사 의무',
  'Serious industrial accident (own & contractor)': '중대 산업재해(자사·협력사)',
  'Intensifying competition for key talent': '핵심 인재 확보 경쟁 심화',
  'Local job creation': '지역 일자리 창출',
  'Product safety defect / recall': '제품 안전 결함·리콜',
  'Inadequate board ESG oversight': '이사회 ESG 감독 미흡',
  'Corruption & sanctions risk (overseas units)': '부패·제재 리스크(해외 사업장)',
  'Renewable-energy transition investment (RE100)': '재생에너지 전환 투자(RE100)',
  'Data breach / cybersecurity': '데이터 유출·사이버보안',
  'Waste-to-resource business line': '폐자원 순환 사업',
  'Improved supplier payment terms': '협력사 대금 지급조건 개선',
  // IRO register item notes
  'Scenario: expanded paid allocation of allowances': '시나리오: 배출권 유상할당 확대',
  'Exposure-quantifying disclosure — feeds hedging decisions': '익스포저를 정량화하는 공시 — 헤지 의사결정에 투입',
  'Physical-risk asset exposure': '물리적 리스크 자산 익스포저',
  'EU CSDDD family': 'EU CSDDD 계열',

  // ── Division names (Metrics, Scenario, Audit trail) ──
  'Refining': '정유',
  'Chemicals': '화학',
  'Materials': '소재',

  // ── Metrics entry ──
  'New submission': '신규 상신',
  'Year': '연도',
  'Value': '값',
  'Evidence attached (mockup)': '증빙 첨부 (목업)',
  '✕ Value must be a non-negative number': '✕ 값은 0 이상의 숫자여야 함',
  'Submit for review': '상신',
  'Import CSV': 'CSV 가져오기',
  'Download template': '템플릿 다운로드',
  'Approval queue': '결재함',
  'Queue is clear.': '결재함이 비어 있습니다.',
  'Approve': '승인',
  'Reject': '반려',
  'Recent activity': '최근 활동',
  'Export CSV': 'CSV 내보내기',
  'Switch to the Division head role to import': '가져오려면 사업부장 역할로 전환',
  'Bulk submit from a CSV (division,datapoint,year,value) — simple CSV, no quoted fields':
    'CSV(division,datapoint,year,value) 일괄 상신 — 따옴표 없는 단순 CSV',
  'Download every approved metric (all divisions) as CSV': '승인된 전 사업부 지표 CSV 다운로드',
  'FY closed — adjustments must be new events': '기말 마감됨 — 조정은 신규 이벤트로',
  'Switch to the Audit role to approve': '승인하려면 감사팀 역할로 전환',
  'Switch to the Audit role to reject': '반려하려면 감사팀 역할로 전환',
  // status labels
  'Pending review': '결재 대기',
  'Approved': '승인됨',
  'Rejected': '반려됨',

  // ── Scenario ──
  'Division parameters': '사업부 파라미터',
  'λ stringency': 'λ 규제 강도',
  'k attenuation': 'k 감쇠',
  'a disclosure cost': 'a 공시 비용',
  'φ distress price': 'φ 디스트레스 가격',
  'σ_f financial vol': 'σ_f 재무 변동성',
  'p_f hedge premium': 'p_f 헤지 프리미엄',
  'd̲ mandated floor': 'd̲ 의무 하한',
  'Optimal disclosure d*': '최적 공시 d*',
  'Optimal financial hedge h_f*': '최적 재무 헤지 h_f*',
  'Regime': '국면',
  'floor binding': '하한 바인딩',
  'voluntary': '자율',
  "These are the divisions' live parameter records: edits persist and flow to the division book on the Decision Dashboard.":
    '사업부별 파라미터의 라이브 레코드입니다. 여기서 고친 값은 그대로 저장되어 의사결정 대시보드의 사업부 장부에 반영됩니다.',
  "How to read it: divisions with larger exposure (σf) and faster penalty attenuation (k) optimally disclose more, and because disclosure lowers the shadow price Λ of residual risk, their hedge ratios move with it — disclosure and hedging are two solutions of one problem. Try raising a division's mandated floor d̲ past its voluntary d* and watch the hedge fall: that is the crowding-out regime.":
    '읽는 법: 익스포저(σf)가 크고 페널티 감쇠(k)가 빠른 사업부일수록 공시를 더 많이 하는 것이 최적입니다. 공시는 잔여 리스크의 잠재가격 Λ를 낮추기 때문에 헤지비율도 따라 움직입니다. 공시와 헤지는 결국 한 문제의 두 답인 셈입니다. 어느 사업부든 의무 하한 d̲를 자율 최적 d*보다 높여 보세요. 헤지가 내려갑니다. 이것이 구축(crowding-out) 국면입니다.',

  // ── Disclosure report ──
  'Strategy': '전략',
  'Risk management': '리스크 관리',
  'Metrics & targets': '지표 및 목표',
  'Climate & Sustainability Disclosure — Draft': '기후·지속가능성 공시 — 초안',
  'HongERP Demo Corp, integrated refiner': 'HongERP 데모 코퍼레이션 · 통합 정유사',
  'Print / Save as PDF': 'PDF로 인쇄·저장',
  'Metrics approved': '승인된 지표',
  'Rejected on review': '검토 반려',
  'Awaiting review': '결재 대기',
  'Review events logged': '기록된 검토 이벤트',
  'Hedge book by instrument': '상품별 헤지 북',
  'Instrument': '상품',
  'Trades': '딜 건수',
  'Notional': '명목금액',
  'IFRS 9 designation mix': 'IFRS 9 지정 구성',
  'cash-flow hedge, combined': '현금흐름위험회피, 통합',
  'cash-flow hedge, split': '현금흐름위험회피, 분리',
  'fair value through P&L': '당기손익-공정가치(FVTPL)',
  'Barrier & budget': '배리어 및 예산',
  'Knock-out probability': '녹아웃 확률',
  'WTI reference spot': 'WTI 기준 스팟',
  'Budget → WTI': '예산 → WTI',
  'Budget → FX': '예산 → FX',
  'Division': '사업부',
  'financial': '재무',
  'impact': '영향',
  'unmapped': '미매핑',

  // ── Audit trail ──
  'When': '시각',
  'Actor': '주체',
  'Action': '동작',
  'Detail': '상세',
  'All': '전체',
  'Filter by action': '동작별 필터',
  'Filter by division': '사업부별 필터',
  'No events match.': '조건에 맞는 이벤트 없음.',
  // event verbs (Audit trail + Activity feed)
  'submitted': '상신',
  'approved': '승인',
  'rejected': '반려',
  'booked': '체결',
  'designated': '지정',
  'closed': '마감',

  // ── Backtest (labels only; prose is lang-branched inline) ──
  'Backtest controls': '백테스트 컨트롤',
  'Estimation window': '추정 윈도',
  'Hedge budget': '헤지 예산',
  'Cost per turnover': '회전당 비용',
  'Variance removed — walk-forward, out of sample': '제거된 변동성 — 워크포워드, 표본외',
  'vs naive': '나이브 대비',
  'gap to oracle': '오라클 격차',
  'Policy': '정책',
  'Ann. vol': '연율 변동성',
  'Variance removed': '제거된 변동성',
  'Max drawdown': '최대 낙폭(MDD)',
  'Cost': '비용',
  'Unhedged': '무헤지',
  'Naive even split': '나이브 균등 분할',
  'Full-sample MV (oracle)': '전체 표본 MV (오라클)',
  'Walk-forward MV': '워크포워드 MV',
  'carry the whole two-factor exposure': '2요인 익스포저 전체를 그대로 부담',
  'split the budget evenly across both legs': '예산을 두 레그에 균등 분할',
  'look-ahead: MV split on the full sample (upper bound)': '미래 참조: 전체 표본 MV 분할 (상한)',
  'covariance-aware split, estimated on strictly past data': '공분산 반영 분할, 철저히 과거 데이터로 추정',
  'Cumulative hedged cost — the flatter the better': '누적 헤지 비용 — 평평할수록 좋음',
  'Cumulative hedged cost by policy': '정책별 누적 헤지 비용',
  'P2 — the dynamic hedge-cost parabola, and why naive c = 1 is off-optimum':
    'P2 — 동적 헤지 비용 포물선, 나이브 c = 1이 최적을 벗어나는 이유',
  'Hedge-cost standard deviation vs coupling c': '커플링 c별 헤지 비용 표준편차',
  'Rolling correlation and FX coverage': '롤링 상관계수와 FX 커버리지',

  // ── Command palette ──
  'Type a command — jump to a module, switch role, start the tour…':
    '명령 입력 — 모듈 이동, 역할 전환, 투어 시작…',
  'No matches': '일치 항목 없음',
  'Command palette': '커맨드 팔레트',
}

// Localised relative-time renderer. AuditTrail / Activity / Metrics entry call
// this instead of erp's timeAgo() so "3h ago" reads "3시간 전" under KO. Same
// thresholds as timeAgo(); kept self-contained so this dict file has no runtime
// dependency on the erp store.
export function agoKo(ts: number, lang: 'en' | 'ko'): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (lang === 'en') {
    if (s < 90) return 'just now'
    const m = Math.floor(s / 60)
    if (m < 90) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 36) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }
  if (s < 90) return '방금 전'
  const m = Math.floor(s / 60)
  if (m < 90) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 36) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}
