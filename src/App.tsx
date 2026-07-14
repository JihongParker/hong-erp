import { useState } from 'react'
import './App.css'

// 모듈 지도 = 제품 로드맵. status는 정직하게 유지한다:
// planned(설계 합의만 됨) → building → live.
const MODULES = [
  {
    id: 'decision',
    name: '결정 대시보드',
    desc: '최적 공시강도 d*·헤지비율 h* — Λ(d) 엔진 라이브 재계산',
    status: 'planned',
    note: '논문 수식 동결 후 엔진 포팅 (선행 조건)',
  },
  {
    id: 'cosa',
    name: '계정체계',
    desc: '지속가능성 계정 트리 → 프레임워크 datapoint 매핑',
    status: 'planned',
    note: 'COSA형 계층코드, 가상 taxonomy 100~300계정',
  },
  {
    id: 'materiality',
    name: '중대성 평가',
    desc: 'IRO 등록 → 이중 중대성 매트릭스 (인터랙티브)',
    status: 'planned',
    note: '',
  },
  {
    id: 'metrics',
    name: '지표 입력',
    desc: '정량지표 입력 → 검증 규칙 → 결재 (UI 목업)',
    status: 'planned',
    note: '',
  },
  {
    id: 'scenario',
    name: '시나리오',
    desc: 'division-level 임의 파라미터 → 전략 배분 비교',
    status: 'planned',
    note: '',
  },
] as const

export default function App() {
  const [active, setActive] = useState<string>('decision')
  const mod = MODULES.find((m) => m.id === active)!

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">홍</span>
          <div>
            <div className="brand-name">홍ERP</div>
            <div className="brand-sub">ESG decision layer</div>
          </div>
        </div>
        <nav>
          {MODULES.map((m) => (
            <button
              key={m.id}
              className={m.id === active ? 'nav-item active' : 'nav-item'}
              onClick={() => setActive(m.id)}
            >
              {m.name}
              <span className={`badge ${m.status}`}>{m.status}</span>
            </button>
          ))}
        </nav>
        <footer className="sidebar-foot">
          v0 골격 · <a href="https://github.com">GitHub</a>
        </footer>
      </aside>

      <main className="content">
        <header>
          <h1>{mod.name}</h1>
          <p className="desc">{mod.desc}</p>
        </header>
        <section className="placeholder">
          <p>
            이 모듈은 아직 <strong>{mod.status}</strong> 단계입니다.
            {mod.note && <> — {mod.note}</>}
          </p>
          <p className="thesis">
            홍ERP의 논지: 기존 회계법인 솔루션은 공시를 <em>비용 센터</em>로
            취급한다. 홍ERP는 공시를 잔존위험의 그림자가격 Λ(d) = φ + λe
            <sup>−kd</sup> 를 낮추는 <em>통제변수</em>로 보고, 최적 헤지 h*와
            최적 공시강도 d*를 하나의 최적화로 함께 푼다.
          </p>
        </section>
      </main>
    </div>
  )
}
