import { KO_DECISION } from './i18n.ko-decision'
import { KO_REPORTING } from './i18n.ko-reporting'
import { useEffect, useState } from 'react'

// Guide-language layer. Scope is deliberately narrow: only the explanatory copy
// is localised — the sidebar module blurbs (GROUPS[].desc) and the guided-tour
// steps (TOUR[].title/body). Banners, chart labels, and every number stay in
// English so the finance vocabulary reads the same in both languages. The choice
// is mirrored to localStorage so a reload keeps the reader's language.

export type Lang = 'en' | 'ko'

const LANG_KEY = 'hongerp-lang'
// broadcast so every useLang()/useT() consumer across the tree re-reads the
// choice — there is no context provider, the window event keeps them in sync.
const LANG_EVENT = 'hongerp-lang-change'

function readLang(): Lang {
  try {
    const raw = localStorage.getItem(LANG_KEY)
    if (raw === 'ko' || raw === 'en') return raw
  } catch {
    /* storage unavailable → default to English */
  }
  return 'en'
}

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLangState] = useState<Lang>(readLang)

  // any instance (sidebar toggle, a module's useT) stays in lockstep
  useEffect(() => {
    const sync = () => setLangState(readLang())
    window.addEventListener(LANG_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(LANG_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const setLang = (l: Lang) => {
    try {
      localStorage.setItem(LANG_KEY, l)
    } catch {
      /* storage blocked; the toggle still works from memory */
    }
    setLangState(l)
    window.dispatchEvent(new CustomEvent(LANG_EVENT))
  }

  return [lang, setLang]
}

// Guide-language layer for running prose. t(en) returns the Korean rendering of
// an English string when the guide is set to Korean and the string is in KO_COPY
// below; otherwise it returns the English unchanged. Keys are the *final*
// English strings verbatim, so the copy in the TSX stays the source of truth.
export function useT(): (en: string) => string {
  const [lang] = useLang()
  return (en: string) => (lang === 'en' ? en : KO_ALL[en] ?? en)
}

// Korean sidebar blurbs, keyed by module id. Any id absent here falls back to
// the English desc defined in App.tsx.
export const KO_DESC: Record<string, string> = {
  decision: '고정 엔진에서 실시간 산출하는 최적 공시 강도 d*와 헤지비율 h*',
  budget: '고정 예산 → 최적 WTI/환 커버리지 배분 (제약 최소분산)',
  instruments:
    '바닐라 라이브러리 — 스왑·캡·칼라·3-way·시걸 (Black-76) + 크랙 스프레드·환 벤치마크·더블 녹아웃 퀀토 (리서치)',
  accounting: 'IFRS 9 현금흐름위험회피 지정: 통합 vs 분리 — OCI, 비유효 부분, 녹아웃 이후',
  cosa: '지속가능성 계정 트리 → 프레임워크 데이터포인트 매핑',
  materiality: '리스크·기회(IRO) 등록부 → 이중 중대성 매트릭스 (인터랙티브)',
  metrics: '정량 지표 → 검증 규칙 → 승인 (목업)',
  report: 'ISSB/KSSB 4대 축 초안 — 승인 지표·헤지 북·의사결정 레이어에서 실시간 조립',
  scenario: '사업부 단위 파라미터 → 전략 비교',
  backtest: 'FRED 40년 데이터 워크포워드 헤지 백테스트 — 알파가 아니라 실현 변동성 축소',
  audittrail: '추가 전용 이벤트 원장 — 모든 상신·승인·부킹·지정 기록',
}

// Korean guided-tour copy, in the same order as TOUR in App.tsx (8 steps). Kept
// tonally faithful to the English walkthrough; jargon is left in the original
// where a Korean gloss would read heavier than the English term.
export const KO_TOUR: { title: string; body: string }[] = [
  {
    title: '무엇이 중요한지 정한다',
    body: '중대성 기준선을 움직여 보라. 기준을 넘는 리스크는 모두 중대 항목이 되어 매트릭스에 불이 들어온다. 여기서 확정된 개수가 이후 모든 화면 상단에, 모델이 헤지하는 익스포저로 따라붙는다. ERP는 여기서 시작된다.',
  },
  {
    title: '숫자를 입력하고 결재한다',
    body: '사업부장이 여기서 지표를 상신하면 오른쪽 결재함으로 넘어가 감사팀이 승인한다. 승인된 값만이 의사결정 레이어가 돌리는 공시 강도 d*를 정한다. 결재를 거치지 않은 숫자는 모델에 닿지 않는다.',
  },
  {
    title: '의무 공시를 올려 본다',
    body: '의무 하한 슬라이더를 오른쪽으로 끌며 위쪽 숫자를 보라. 헤지비율이 내려간다. 규제 당국이 기업에 공시를 더 강제하면, 헤지도 조용히 그만큼 내려간다.',
  },
  {
    title: '예산을 풀어 본다',
    body: '예산 슬라이더를 올려 보라. 쓸 돈이 크게 늘어도 원유와 환의 배분은 97 / 3에서 거의 움직이지 않는다. 예산 제약이 풀리는 순간, 배분을 정하는 것은 지갑 크기가 아니라 시장의 형태다.',
  },
  {
    title: '공짜 헤지를 짜 본다',
    body: '위쪽이 바닐라 데스크다 — 정유사가 실제로 굴리는 다섯 구조가 아래 띠에 있다. 제로코스트 칼라가 떠 있다. 캡 슬라이더를 올리면 데스크가 그 비용을 상쇄하는 플로어를 즉시 찾아 순 프리미엄이 0이 된다. 옆의 퀀토 데스크는 리서치 쪽이다.',
  },
  {
    title: '배리어 안으로 걸어 들어간다',
    body: '이 탭을 연 다음 WTI 스팟 슬라이더를 밀어 올려 보라. 리스크 모니터가 위험까지 오르고 헤지가 거꾸로 작동하기 시작한다. 교과서적 방법이 무너지는 바로 그 지점이다.',
  },
  {
    title: '숫자를 따라가 본다',
    body: '방금 설정한 녹아웃 확률이 스스로 여기까지, 화면 상단으로 넘어왔다. 하나의 공유 상태로 모든 화면이 연결된다. 그것이 이 시스템의 전부다.',
  },
  {
    title: '표본 밖에서 증명한다',
    body: '지금까지는 전부 한 장의 스냅샷이었다. 여기서는 같은 헤지를 실제 원유·환 데이터 40년에 걸쳐 매달 다시 돌리되, 매 결정에 과거 데이터만 쓴다. 슬라이더를 조금만 건드려도 전체 이력이 다시 계산된다. 그래도 헤지는 수입 대금의 출렁임을 약 89% 지운다. 핵심은 이것이다 — 돈을 버는 베팅이 아니라, 그저 버텨 주는 헤지라는 것.',
  },
]

// Running-prose dictionary for useT(). Keys are the final English strings exactly
// as they render (whitespace collapsed to single spaces). Only plain-text blocks
// live here; blocks that interleave live numbers or <strong> emphasis are
// translated inline in their module via a lang === 'ko' branch, so the figures,
// tables, chart labels and buttons stay in English as designed.
export const KO_COPY: Record<string, string> = {
  // ── Overview ──
  "Four papers, one Korean oil importer's WTI × USD/KRW exposure. Each picks up where the last leaves off.":
    '논문 네 편, 한국 원유 수입사의 WTI × USD/KRW 익스포저 하나. 각 논문은 앞 논문이 끝난 지점에서 이어진다.',
  "Risks set the exposure, the budget hits the desks, the desks' knock-out odds drive the books, and disclosure closes the loop.":
    '리스크가 익스포저를 정하고, 예산이 데스크로 내려가며, 데스크의 녹아웃 확률이 장부를 움직이고, 공시가 그 고리를 닫는다.',
  '+ two applied notes: KIKO forensics (P5) · the benign vs. the lethal barrier (P6)':
    '+ 응용 노트 두 편: KIKO 포렌식 (P5) · 무해한 배리어 vs. 치명적 배리어 (P6)',

  // ── Hedge Instruments: vanilla strategy blurbs ──
  'Lock the price. Zero premium, zero optionality — the corporate default.':
    '가격을 고정한다. 프리미엄 0, 옵셔널리티 0 — 기업의 표준 선택.',
  'Buy protection outright, keep all the downside. Costs premium in cash.':
    '보호를 직접 매수하고 하방 이익은 모두 유지한다. 대신 프리미엄을 현금으로 지불한다.',
  'Cap financed by a sold floor. No cash out; you give up participation below the floor.':
    '매도 플로어로 캡 비용을 충당한다. 현금 지출은 없지만, 플로어 아래 이익 참여를 포기한다.',
  'Collar + a second sold put funds a lower floor, but a crash below it tears the protection back open.':
    '칼라에 풋을 하나 더 매도해 더 낮은 플로어를 만든다. 다만 그 아래로 급락하면 보호막이 다시 찢어진다.',
  'Collar whose upside cap ends at a ceiling. Cheaper strikes, but a spike past the ceiling re-exposes you.':
    '상방 캡이 실링에서 끝나는 칼라. 행사가는 싸지지만, 실링을 넘어 급등하면 다시 익스포저가 열린다.',

  // ── Hedge Instruments: the "zero cost" caveat banner ──
  [`"Zero cost" is not "no cost" — every sold leg is short optionality, paid for in scenarios rather than cash. Push it one step further and the sold wing becomes a barrier: the three-way and seagull are one calibration away from the knock-in/knock-out structures that devastated Korean SMEs in 2008. Barrier analytics for exactly that risk are the Exotic Desk's job (research tab).`]:
    '‘제로 코스트’는 ‘무비용’이 아니다 — 매도한 다리는 모두 옵셔널리티 매도 포지션이며, 그 대가는 현금이 아니라 시나리오로 치른다. 여기서 한 걸음 더 나아가면 매도 윙이 배리어가 된다. 3-way와 시걸은 2008년 한국 중소기업을 무너뜨린 녹인/녹아웃 구조와 캘리브레이션 한 끗 차이다. 바로 그 리스크를 겨냥한 배리어 분석이 이그저틱 데스크(리서치 탭)의 몫이다.',

  // ── Exotic Desk: structure-selector blurb ──
  'The paper structure: a double knock-out quanto priced from the jump-diffusion MC surface. Watch the value collapse and the delta reverse as spot nears a barrier.':
    '논문의 구조. 점프-확산 MC 표면에서 프라이싱한 더블 녹아웃 퀀토. 스팟이 배리어에 다가갈수록 가치가 무너지고 델타가 뒤집히는 것을 지켜보라.',
  'The same jump-diffusion calibration with both barriers removed, priced in closed form. Subtract it from the Double-KO and what is left is exactly the survival risk the barriers inject.':
    '같은 점프-확산 캘리브레이션에서 두 배리어를 모두 제거해 닫힌 해로 프라이싱한다. 이 값을 더블 녹아웃에서 빼면 남는 것이 바로 배리어가 주입하는 생존 리스크다.',

  // ── Disclosure report: header subtitle + footer ──
  'Prepared on the ISSB/KSSB four-pillar structure · demo document assembled live from the ERP ledgers':
    'ISSB/KSSB 4대 축 구조로 작성 · ERP 원장에서 실시간 조립한 데모 문서',
  'Sustainability data reaches this report only through a segregated approval workflow. Submission, review, booking and designation are held in four separate hands: division heads submit metrics, Audit (J. Kim) approves or rejects them, the Treasury desk books hedges, and the CFO office designates them. No single actor can both file a figure and sign it off.':
    '지속가능성 데이터는 분리된 승인 워크플로를 거쳐야만 이 보고서에 도달한다. 상신·검토·기표·지정은 네 손에 나뉜다. 사업부장이 지표를 상신하고, 감사팀(J. Kim)이 승인 또는 반려하며, 자금부 데스크가 헤지를 부킹하고, CFO 오피스가 지정한다. 어느 한 주체도 수치를 작성하면서 동시에 승인할 수는 없다.',
  'Draft assembled from live ERP state: figures are demo data; engines are frozen paper transcriptions.':
    '실시간 ERP 상태에서 조립한 초안. 수치는 데모 데이터이며, 엔진은 고정된 논문 전사본이다.',

  // ── Backtest: control caption ──
  'Rolling window sets how much past data estimates Σ; budget caps total coverage (<2 binds); cost is charged on rebalancing turnover. The walk-forward result stays ~14pp above naive across the whole slider range — the edge is not a tuned artifact.':
    '롤링 윈도는 Σ 추정에 과거 데이터를 얼마나 쓸지 정한다. 예산은 총 커버리지에 상한을 둔다(<2에서 바인딩). 비용은 리밸런싱 회전에 부과된다. 워크포워드 결과는 슬라이더 전 구간에서 나이브 대비 ~14pp 위를 유지한다 — 이 우위는 튜닝으로 만든 산물이 아니다.',
}

// master lookup: base copy + the two layer dictionaries (later wins on dupes)
const KO_ALL: Record<string, string> = { ...KO_COPY, ...KO_DECISION, ...KO_REPORTING }
