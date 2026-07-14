// IRO (Impact · Risk · Opportunity) register — demo data
// Double materiality: financial and impact materiality, each scored 1–5.
// Scores assume a hypothetical manufacturer. Not a real assessment.

export type PillarCode = 'E' | 'S' | 'G'
export type IroType = 'risk' | 'opportunity' | 'impact'

export interface IroItem {
  id: string
  name: string
  pillar: PillarCode
  type: IroType
  financial: number // 1–5
  impact: number // 1–5
  note: string
}

export const IRO_TYPE_LABELS: Record<IroType, string> = {
  risk: 'Risk',
  opportunity: 'Opportunity',
  impact: 'Impact',
}

export const PILLAR_COLORS: Record<PillarCode, string> = {
  E: '#2e7d52',
  S: '#2f6db4',
  G: '#b3610f',
}

export const PILLAR_LABELS: Record<PillarCode, string> = {
  E: 'Environment',
  S: 'Social',
  G: 'Governance',
}

export const IRO_ITEMS: IroItem[] = [
  { id: 'IRO-01', name: 'Cost increase from carbon-pricing expansion', pillar: 'E', type: 'risk', financial: 4.6, impact: 3.8, note: 'Scenario: expanded paid allocation of allowances' },
  { id: 'IRO-02', name: 'Climate disclosure mandate (KSSB S2) compliance', pillar: 'G', type: 'risk', financial: 3.9, impact: 3.2, note: 'Exposure-quantifying disclosure — feeds hedging decisions' },
  { id: 'IRO-03', name: 'Demand growth for low-carbon product lines', pillar: 'E', type: 'opportunity', financial: 4.2, impact: 4.0, note: '' },
  { id: 'IRO-04', name: 'Flood & typhoon physical risk (coastal sites)', pillar: 'E', type: 'risk', financial: 3.4, impact: 4.3, note: 'Physical-risk asset exposure' },
  { id: 'IRO-05', name: 'Operational disruption in water-stressed regions', pillar: 'E', type: 'risk', financial: 2.8, impact: 3.6, note: '' },
  { id: 'IRO-06', name: 'Supply-chain human-rights due-diligence mandates', pillar: 'S', type: 'risk', financial: 3.1, impact: 4.1, note: 'EU CSDDD family' },
  { id: 'IRO-07', name: 'Serious industrial accident (own & contractor)', pillar: 'S', type: 'risk', financial: 4.4, impact: 4.7, note: '' },
  { id: 'IRO-08', name: 'Intensifying competition for key talent', pillar: 'S', type: 'risk', financial: 3.3, impact: 2.6, note: '' },
  { id: 'IRO-09', name: 'Local job creation', pillar: 'S', type: 'impact', financial: 1.8, impact: 3.4, note: '' },
  { id: 'IRO-10', name: 'Product safety defect / recall', pillar: 'S', type: 'risk', financial: 3.8, impact: 3.9, note: '' },
  { id: 'IRO-11', name: 'Inadequate board ESG oversight', pillar: 'G', type: 'risk', financial: 2.4, impact: 2.9, note: '' },
  { id: 'IRO-12', name: 'Corruption & sanctions risk (overseas units)', pillar: 'G', type: 'risk', financial: 3.6, impact: 3.3, note: '' },
  { id: 'IRO-13', name: 'Renewable-energy transition investment (RE100)', pillar: 'E', type: 'opportunity', financial: 2.9, impact: 3.9, note: '' },
  { id: 'IRO-14', name: 'Data breach / cybersecurity', pillar: 'G', type: 'risk', financial: 4.1, impact: 3.0, note: '' },
  { id: 'IRO-15', name: 'Waste-to-resource business line', pillar: 'E', type: 'opportunity', financial: 2.2, impact: 3.1, note: '' },
  { id: 'IRO-16', name: 'Improved supplier payment terms', pillar: 'S', type: 'impact', financial: 1.6, impact: 2.7, note: '' },
]
