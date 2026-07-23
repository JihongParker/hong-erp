import { KO_DECISION } from './i18n.ko-decision'
import { KO_REPORTING } from './i18n.ko-reporting'
import { KO_TAXONOMY } from './i18n.ko-taxonomy'
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
  decision: '동결 엔진에서 실시간 산출하는 최적 공시 강도 d*와 헤지비율 h*',
  budget: '고정 예산 → 최적 WTI/환 커버리지 배분 (제약 최소분산)',
  instruments:
    '실무 표준 헤지 구조부터 리서치용 배리어 데스크까지, 실제로 운용하는 방식 그대로',
  accounting: 'IFRS 9 현금흐름위험회피 지정: 통합 vs 분리 — OCI, 비유효 부분, 녹아웃 이후',
  cosa: '지속가능성 계정 트리 → 프레임워크 데이터포인트 매핑',
  materiality: '리스크·기회(IRO) 등록부 → 이중 중대성 매트릭스 (인터랙티브)',
  metrics: '정량 지표 → 검증 규칙 → 승인 (목업)',
  report: 'ISSB/KSSB 구조의 공시 보고서 초안',
  scenario: '사업부 단위 파라미터 → 전략 비교',
  backtest: 'FRED 40년 데이터 워크포워드 헤지 백테스트 — 알파가 아니라 실현 변동성 축소',
  audittrail: '한 번 쓰면 지울 수 없는 이벤트 원장 — 모든 상신·승인·체결·지정을 기록',
}

// Korean guided-tour copy, in the same order as TOUR in App.tsx (8 steps). Kept
// tonally faithful to the English walkthrough; jargon is left in the original
// where a Korean gloss would read heavier than the English term.
export const KO_TOUR: { title: string; body: string }[] = [
  {
    title: '무엇이 중요한지 정하기',
    body: '중대성 기준선을 움직여 보세요. 기준을 넘는 리스크는 중대 항목이 되어 매트릭스에 불이 들어옵니다. 여기서 확정된 항목 수는 이후 모든 화면 상단에 따라다니는, 이 회사가 관리하기로 한 위험 목록입니다. ERP는 여기서 시작됩니다.',
  },
  {
    title: '숫자를 상신하고 결재받기',
    body: '사업부장이 지표를 상신하면 오른쪽 결재함으로 넘어가고, 감사팀이 승인합니다. 승인된 값만 의사결정 레이어의 공시 강도 d*에 반영됩니다. 결재를 거치지 않은 숫자는 모델에 닿지 않습니다.',
  },
  {
    title: '의무 공시를 올려 보기',
    body: '의무 하한 슬라이더를 오른쪽으로 끌면서 위쪽 숫자를 지켜보세요. 헤지비율이 내려갑니다. 규제가 공시를 강하게 요구할수록 헤지는 그만큼 조용히 줄어듭니다.',
  },
  {
    title: '예산을 풀어 보기',
    body: '예산 슬라이더를 올려 보세요. 쓸 수 있는 돈이 크게 늘어도 원유와 환의 배분은 97 / 3에서 거의 움직이지 않습니다. 예산 제약이 풀리고 나면 배분을 정하는 것은 돈의 크기가 아니라 시장의 구조입니다.',
  },
  {
    title: '제로코스트 헤지 짜 보기',
    body: '위쪽이 바닐라 데스크입니다. 정유사가 실제로 굴리는 다섯 가지 구조가 아래 띠에 있고, 지금은 제로코스트 칼라가 선택되어 있습니다. 캡 슬라이더를 올리면 데스크가 그 비용을 상쇄하는 플로어를 즉시 찾아 순 프리미엄을 0으로 맞춥니다. 옆의 퀀토 데스크는 리서치 영역입니다.',
  },
  {
    title: '배리어 앞까지 가 보기',
    body: '퀀토 데스크 탭이 방금 자동으로 열렸습니다. 왼쪽 포지션 패널의 WTI 스팟 S₁ 슬라이더를 상단 배리어 쪽으로 밀어 올려 보세요. 배리어 리스크 모니터가 위험 단계까지 차오르고, 델타가 거꾸로 움직이기 시작합니다. 교과서 공식이 무너지는 바로 그 지점입니다.',
  },
  {
    title: '숫자를 따라가 보기',
    body: '방금 데스크에서 만든 녹아웃 확률이 어느새 이 화면 상단까지 따라와 있습니다. 모든 화면이 하나의 공유 상태로 연결되어 있기 때문입니다. 이 시스템의 핵심입니다.',
  },
  {
    title: '표본 밖에서 증명하기',
    body: '지금까지는 한 장의 스냅샷이었습니다. 여기서는 같은 헤지를 실제 원유·환율 데이터 40년에 걸쳐 매달 다시 돌리되, 매 결정에 과거 데이터만 씁니다. 슬라이더를 조금만 건드려도 전체 이력이 다시 계산되는데, 그래도 헤지는 수입 대금의 출렁임을 약 89% 지워 줍니다. 수익을 노리는 베팅이 아니라 흔들릴 때 버텨 주는 헤지, 그것이 핵심입니다. 이로써 한 바퀴가 닫혔습니다 — 방금 지나온 화면들이 논문 네 편을 하나의 시스템으로 돌린 결과입니다.',
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
    '논문 네 편이 한국 원유 수입사의 WTI × USD/KRW 익스포저 하나를 차례로 다룹니다. 앞 논문이 끝난 자리에서 다음 논문이 이어집니다.',
  'Risks price the exposure, disclosure prices the risk of carrying it, the budget and the desks trade at that price, and the books hand the answer back.':
    '리스크 평가가 익스포저를 정하고, 공시 문제가 그 위험을 안고 갈 값을 매깁니다. 예산과 데스크는 그 값에 맞춰 움직이고, 장부의 지정 결과는 다시 공시 문제로 되돌아옵니다.',
  'applied note': '응용 노트',
  'KIKO forensics: the 2008 contract, re-priced': 'KIKO 해부: 2008년 계약을 다시 계산하다',
  'The canonical 1-put-2-call KIKO, run through this series\' machinery: the "zero-cost" package carried a hidden transfer near 5% of notional.':
    '전형적인 1풋-2콜 KIKO를 이 프로그램의 엔진으로 다시 계산합니다. \'제로 코스트\'로 팔린 상품에서 기업은 사실상 명목금액의 5%에 가까운 값을 지불하고 있었습니다.',
  'Protection dead in >95% of the scenarios it was needed; knock-in odds 97% on a 5% depreciation':
    '보호가 필요한 상황의 95% 이상에서 이미 소멸 · 5% 절하 시 녹인 발동 확률 97%',
  'The benign and the lethal barrier': '무해한 배리어, 치명적 배리어',
  "KIKO and this program's double knock-out under one calibration: near-twin barrier mortality, opposite balance sheets.":
    'KIKO와 이 프로그램의 더블 녹아웃을 같은 캘리브레이션으로 나란히 세웁니다. 배리어 소멸률은 쌍둥이처럼 닮았는데, 재무제표에 남는 효과는 정반대입니다.',
  'What separates them is who owns the optionality, and a framework willing to reject its own trade':
    '둘을 가르는 것은 기업이 그 옵션을 샀느냐 팔았느냐, 그리고 자기 상품도 기각하는 검증 관문이 있었느냐입니다',

  // ── Hedge Instruments: vanilla strategy blurbs ──
  'Lock the price. Zero premium, zero optionality — the corporate default.':
    '선도 가격에 그대로 고정합니다. 프리미엄도 선택권도 없는, 기업 헤지의 기본값입니다.',
  'Buy protection outright, keep all the downside. Costs premium in cash.':
    '보호를 통째로 사고, 유가가 내릴 때의 이익은 전부 남깁니다. 대신 프리미엄이 현금으로 나갑니다.',
  'Cap financed by a sold floor. No cash out; you give up participation below the floor.':
    '플로어를 팔아 캡 프리미엄을 상쇄합니다. 들어가는 비용은 없지만, 유가가 플로어 아래로 내려갔을 때의 이익은 포기하는 구조입니다.',
  'Collar + a second sold put funds a lower floor, but a crash below it tears the protection back open.':
    '칼라에 풋을 한 장 더 팔아 플로어를 더 낮게 가져갑니다. 다만 유가가 그 아래로 급락하면 보호가 도로 뚫립니다.',
  'Collar whose upside cap ends at a ceiling. Cheaper strikes, but a spike past the ceiling re-exposes you.':
    '상방 보호가 실링까지만 미치는 칼라입니다. 그만큼 조건은 좋아지지만, 실링을 넘는 급등에는 다시 무방비가 됩니다.',

  // ── Hedge Instruments: the "zero cost" caveat banner ──
  [`"Zero cost" is not "no cost" — every sold leg is short optionality, paid for in scenarios rather than cash. Push it one step further and the sold wing becomes a barrier: the three-way and seagull are one calibration away from the knock-in/knock-out structures that devastated Korean SMEs in 2008. Barrier analytics for exactly that risk are the Exotic Desk's job (research tab).`]:
    "'제로 코스트'는 공짜라는 뜻이 아닙니다. 매도한 레그는 전부 옵션을 판 포지션이고, 그 값은 현금 대신 불리한 시나리오에서 치르게 됩니다. 여기서 한 발만 더 나가면 매도 윙이 배리어로 변하는데, 3-way와 시걸은 2008년 한국 중소기업들을 무너뜨린 녹인/녹아웃 구조와 캘리브레이션 한 끗 차이입니다. 바로 그 리스크를 뜯어보는 배리어 분석은 퀀토 데스크(리서치 탭)에서 다룹니다.",

  // ── Exotic Desk: structure-selector blurb ──
  'The paper structure: a double knock-out quanto priced from the jump-diffusion MC surface. Watch the value collapse and the delta reverse as spot nears a barrier.':
    '논문에서 다루는 바로 그 구조입니다. 점프-확산 몬테카를로 표면으로 가격을 매긴 더블 녹아웃 퀀토로, 스팟이 배리어에 가까워질수록 가치가 급락하고 델타의 부호가 뒤집힙니다.',
  'The same jump-diffusion calibration with both barriers removed, priced in closed form. Subtract it from the Double-KO and what is left is the survival risk the barriers inject.':
    '같은 점프-확산 캘리브레이션에서 배리어만 둘 다 걷어내고 닫힌 해로 가격을 구합니다. 더블 녹아웃 값에서 이 값을 빼면, 배리어가 얹는 생존 리스크만 정확히 남습니다.',

  // ── Disclosure report: header subtitle + footer ──
  'Prepared on the ISSB/KSSB four-pillar structure · demo document assembled live from the ERP ledgers':
    'ISSB/KSSB 공시 구조에 따라 작성한 데모 문서 · 수치는 ERP 원장 기준',
  'Sustainability data reaches this report only through a segregated approval workflow. Submission, review, booking and designation are held in four separate hands: division heads submit metrics, Audit (J. Kim) approves or rejects them, the Treasury desk books hedges, and the CFO office designates them. No single actor can both file a figure and sign it off.':
    '지속가능성 데이터는 분리된 승인 워크플로를 거쳐야만 본 보고서에 반영된다. 상신·검토·체결·지정의 권한은 네 주체에 분리되어 있다. 사업부장이 지표를 상신하면 감사팀(J. Kim)이 승인 또는 반려하고, 자금부 데스크가 헤지를 체결하며, CFO 오피스가 회계 지정을 맡는다. 수치를 작성한 사람이 그 수치를 승인할 수 없도록 설계된 구조다.',
  'Draft assembled from live ERP state: figures are demo data; engines are frozen paper transcriptions.':
    '실시간 ERP 상태에서 뽑아 조립한 초안이다. 수치는 데모 데이터이며, 계산 엔진은 논문 수식을 그대로 옮겨 동결한 것이다.',

  // ── Backtest: control caption ──
  'Rolling window sets how much past data estimates Σ; budget caps total coverage (<2 binds); cost is charged on rebalancing turnover. The walk-forward result stays ~14pp above naive across the whole slider range — the edge is not a tuned artifact.':
    '롤링 윈도는 Σ를 추정할 때 과거 데이터를 몇 달치 쓸지 정합니다. 예산은 총 커버리지의 상한이고(2 밑에서 바인딩), 비용은 리밸런싱 회전량에 붙습니다. 워크포워드 결과는 슬라이더를 어디에 두든 단순 분할보다 14pp 안팎 앞서 있어, 파라미터를 잘 골라 만든 우위가 아님을 보여 줍니다.',
}

// master lookup: base copy + the two layer dictionaries (later wins on dupes)
const KO_ALL: Record<string, string> = { ...KO_COPY, ...KO_DECISION, ...KO_REPORTING, ...KO_TAXONOMY }
