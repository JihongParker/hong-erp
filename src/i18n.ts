import { useEffect, useState } from 'react'

// Guide-language layer. Scope is deliberately narrow: only the explanatory copy
// is localised — the sidebar module blurbs (GROUPS[].desc) and the guided-tour
// steps (TOUR[].title/body). Banners, chart labels, and every number stay in
// English so the finance vocabulary reads the same in both languages. The choice
// is mirrored to localStorage so a reload keeps the reader's language.

export type Lang = 'en' | 'ko'

const LANG_KEY = 'hongerp-lang'

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const raw = localStorage.getItem(LANG_KEY)
      if (raw === 'ko' || raw === 'en') return raw
    } catch {
      /* storage unavailable → default to English */
    }
    return 'en'
  })

  useEffect(() => {
    try {
      localStorage.setItem(LANG_KEY, lang)
    } catch {
      /* storage blocked; the toggle still works from memory */
    }
  }, [lang])

  return [lang, setLang]
}

// Korean sidebar blurbs, keyed by module id. Any id absent here falls back to
// the English desc defined in App.tsx.
export const KO_DESC: Record<string, string> = {
  decision: '최적 공시 강도 d*와 헤지 비율 h* — 고정된 엔진에서 실시간 산출',
  budget: '고정 예산 → 최적 WTI/환 커버리지 배분 (제약 최소분산)',
  instruments:
    '바닐라 라이브러리 — 스왑 · 캡 · 칼라 · 3-way · 시걸 (Black-76) + 크랙 스프레드 · 환 벤치마크 · 더블 녹아웃 퀀토 (연구)',
  accounting: 'IFRS 9 현금흐름위험회피 지정: 통합 vs 분리 — 기타포괄손익, 비효과성, 녹아웃 이후',
  cosa: '지속가능성 계정 트리 → 프레임워크 데이터포인트 매핑',
  materiality: '리스크·기회(IRO) 등록부 → 이중 중대성 매트릭스 (인터랙티브)',
  metrics: '정량 지표 → 검증 규칙 → 승인 (목업)',
  report: 'ISSB/KSSB 4대 축 초안 — 승인된 지표, 헤지 북, 의사결정 층에서 실시간 조립',
  scenario: '사업부 단위 파라미터 → 전략 비교',
  backtest: 'FRED 40년 데이터 워크포워드 헤지 백테스트 — 알파가 아니라 실현 분산 감소',
  audittrail: '추가 전용 이벤트 원장 — 모든 제출·승인·기표·지정 기록',
}

// Korean guided-tour copy, in the same order as TOUR in App.tsx (8 steps). Kept
// tonally faithful to the English walkthrough; jargon is left in the original
// where a Korean gloss would read heavier than the English term.
export const KO_TOUR: { title: string; body: string }[] = [
  {
    title: '무엇이 중요한지 정한다',
    body: '중대성 기준선을 움직여 보세요. 기준을 넘는 리스크는 모두 중대 항목이 되어 매트릭스에 불이 들어옵니다 — 그리고 여기서 확정된 개수가 이후 모든 화면 상단에, 모델이 헤지하는 익스포저로 따라붙습니다. ERP는 바로 여기서 시작됩니다.',
  },
  {
    title: '숫자를 입력하고, 승인한다',
    body: '사업부장이 여기서 지표를 제출하면 오른쪽 승인 대기열로 넘어가 감사가 승인합니다. 승인된 값만이 의사결정 층이 돌리는 공시 강도 d*를 결정합니다 — 승인 없이는 어떤 숫자도 모델에 닿지 않습니다.',
  },
  {
    title: '의무 공시를 올려 본다',
    body: '의무 하한 슬라이더를 오른쪽으로 끌면서 위쪽 숫자를 지켜보세요. 헤지 비율이 내려갑니다 — 규제 당국이 기업에 더 많은 공시를 강제하면, 헤지도 조용히 그 뒤를 따라 내려갑니다.',
  },
  {
    title: '예산을 풀어 본다',
    body: '예산 슬라이더를 올려 보세요. 쓸 돈이 훨씬 많아져도 원유와 환의 배분은 97 / 3에서 거의 움직이지 않습니다 — 예산 제약이 풀리는 순간, 배분을 정하는 것은 지갑의 크기가 아니라 시장의 형태입니다.',
  },
  {
    title: '공짜 헤지를 짜 본다',
    body: '여기는 바닐라 데스크(상단)입니다 — 정유사가 실제로 굴리는 다섯 가지 구조가 아래 띠에 있습니다. 제로코스트 칼라가 떠 있습니다: 캡 슬라이더를 올리면 데스크가 그 비용을 상쇄하는 플로어를 즉시 찾아내 순 프리미엄이 0이 됩니다. 옆의 퀀토 데스크는 연구 쪽입니다.',
  },
  {
    title: '배리어 안으로 걸어 들어간다',
    body: '이 탭을 연 다음 WTI 현물 슬라이더를 밀어 올려 보세요. 리스크 모니터가 Critical까지 올라가고 헤지가 거꾸로 작동하기 시작합니다 — 교과서적 방법이 무너지는 바로 그 지점입니다.',
  },
  {
    title: '숫자를 따라가 본다',
    body: '방금 설정한 녹아웃 확률이 스스로 여기까지 넘어왔습니다 — 화면 상단입니다. 하나의 공유 상태, 모든 화면이 연결됩니다. 그것이 이 시스템의 전부입니다.',
  },
  {
    title: '표본 밖에서 증명한다',
    body: '지금까지는 전부 한 장의 스냅샷이었습니다. 여기서는 같은 헤지를 실제 원유·환 데이터 40년에 걸쳐 매달 다시 돌리되, 매번의 결정에 과거 데이터만 사용합니다. 슬라이더를 조금만 건드려도 전체 이력이 다시 계산됩니다 — 그래도 헤지는 수입 대금의 출렁임을 약 89% 지워냅니다. 핵심은 이것입니다: 돈을 버는 베팅이 아니라, 그저 버텨 주는 헤지라는 것.',
  },
]
