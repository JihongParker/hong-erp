// IRO(Impact·Risk·Opportunity) 등록부 — 데모 데이터
// 이중 중대성: financial(재무적 중대성)·impact(영향 중대성) 각 1~5점.
// 가상의 제조업 화자를 가정해 점수를 배치했다. 실무 평가 아님.

export type PillarCode = 'E' | 'S' | 'G'
export type IroType = 'risk' | 'opportunity' | 'impact'

export interface IroItem {
  id: string
  name: string
  pillar: PillarCode
  type: IroType
  financial: number // 1~5
  impact: number // 1~5
  note: string
}

export const IRO_TYPE_LABELS: Record<IroType, string> = {
  risk: '리스크',
  opportunity: '기회',
  impact: '임팩트',
}

export const PILLAR_COLORS: Record<PillarCode, string> = {
  E: '#2e7d52',
  S: '#2f6db4',
  G: '#b3610f',
}

export const IRO_ITEMS: IroItem[] = [
  { id: 'IRO-01', name: '탄소가격제 확대에 따른 원가 상승', pillar: 'E', type: 'risk', financial: 4.6, impact: 3.8, note: '배출권 유상할당 확대 시나리오' },
  { id: 'IRO-02', name: '기후공시 의무화(KSSB S2) 대응', pillar: 'G', type: 'risk', financial: 3.9, impact: 3.2, note: '노출 정량화 공시 — 헤지 의사결정과 직결' },
  { id: 'IRO-03', name: '저탄소 제품 라인 수요 성장', pillar: 'E', type: 'opportunity', financial: 4.2, impact: 4.0, note: '' },
  { id: 'IRO-04', name: '홍수·태풍 물리 리스크 (연안 사업장)', pillar: 'E', type: 'risk', financial: 3.4, impact: 4.3, note: '물리적 리스크 자산 노출' },
  { id: 'IRO-05', name: '용수 부족 지역 조업 차질', pillar: 'E', type: 'risk', financial: 2.8, impact: 3.6, note: '' },
  { id: 'IRO-06', name: '공급망 인권 실사 의무화', pillar: 'S', type: 'risk', financial: 3.1, impact: 4.1, note: 'EU CSDDD 계열' },
  { id: 'IRO-07', name: '중대재해 발생 (직영·협력사)', pillar: 'S', type: 'risk', financial: 4.4, impact: 4.7, note: '' },
  { id: 'IRO-08', name: '핵심인재 확보 경쟁 심화', pillar: 'S', type: 'risk', financial: 3.3, impact: 2.6, note: '' },
  { id: 'IRO-09', name: '지역사회 고용 창출', pillar: 'S', type: 'impact', financial: 1.8, impact: 3.4, note: '' },
  { id: 'IRO-10', name: '제품 안전 결함·리콜', pillar: 'S', type: 'risk', financial: 3.8, impact: 3.9, note: '' },
  { id: 'IRO-11', name: '이사회 ESG 감독 체계 미비', pillar: 'G', type: 'risk', financial: 2.4, impact: 2.9, note: '' },
  { id: 'IRO-12', name: '부패·제재 리스크 (해외 법인)', pillar: 'G', type: 'risk', financial: 3.6, impact: 3.3, note: '' },
  { id: 'IRO-13', name: '재생에너지 전환 투자 (RE100)', pillar: 'E', type: 'opportunity', financial: 2.9, impact: 3.9, note: '' },
  { id: 'IRO-14', name: '데이터 유출·사이버 보안', pillar: 'G', type: 'risk', financial: 4.1, impact: 3.0, note: '' },
  { id: 'IRO-15', name: '폐기물 재자원화 사업', pillar: 'E', type: 'opportunity', financial: 2.2, impact: 3.1, note: '' },
  { id: 'IRO-16', name: '협력사 결제조건 개선', pillar: 'S', type: 'impact', financial: 1.6, impact: 2.7, note: '' },
]
