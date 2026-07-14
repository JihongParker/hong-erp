import { useMemo, useState } from 'react'
import {
  ENGINE_VERSION,
  solve,
  type DivisionParams,
} from '../engine/provisional'
import './Scenario.css'

// 사업부 색 — 검증 통과 팔레트(계정체계·중대성과 동일 3색)를 엔티티(사업부)에
// 고정 순서로 배정. 색은 사업부를 따라간다 (차트 간 일관).
const DIV_COLORS = ['#2e7d52', '#2f6db4', '#b3610f']

const DEFAULT_DIVISIONS: DivisionParams[] = [
  { name: '정유부문', lambda: 8, k: 0.9, a: 1.2, phi: 1.0, R: 10, sigma: 1.4, p: 1.2 },
  { name: '화학부문', lambda: 5, k: 0.6, a: 1.8, phi: 0.8, R: 6, sigma: 1.0, p: 1.0 },
  { name: '소재부문', lambda: 2, k: 0.5, a: 2.5, phi: 0.6, R: 3, sigma: 0.7, p: 0.9 },
]

const PARAM_META: { key: keyof Omit<DivisionParams, 'name'>; label: string; min: number; max: number; step: number }[] = [
  { key: 'lambda', label: 'λ 페널티 규모', min: 0, max: 15, step: 0.5 },
  { key: 'k', label: 'k 감쇠 속도', min: 0.1, max: 2, step: 0.05 },
  { key: 'a', label: 'a 공시비용', min: 0.2, max: 5, step: 0.1 },
  { key: 'phi', label: 'φ 기저 위험가격', min: 0, max: 3, step: 0.1 },
  { key: 'R', label: 'R 노출 규모', min: 0, max: 20, step: 0.5 },
  { key: 'sigma', label: 'σ 변동성', min: 0.2, max: 3, step: 0.05 },
  { key: 'p', label: 'p 헤지 프리미엄', min: 0, max: 4, step: 0.1 },
]

// 가로 막대 소품 — 4px 라운드 데이터엔드, 얇은 마크, 베이스라인 고정
function Bar({ frac, color }: { frac: number; color: string }) {
  return (
    <div className="sc-bar-track">
      <div
        className="sc-bar-fill"
        style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%`, background: color }}
      />
    </div>
  )
}

export default function Scenario() {
  const [divs, setDivs] = useState<DivisionParams[]>(DEFAULT_DIVISIONS)
  const [sel, setSel] = useState(0)

  const solutions = useMemo(() => divs.map((d) => solve(d)), [divs])
  const dMax = Math.max(...solutions.map((s) => s.dStar), 0.1)

  const setParam = (key: keyof Omit<DivisionParams, 'name'>, value: number) =>
    setDivs((prev) => prev.map((d, i) => (i === sel ? { ...d, [key]: value } : d)))

  return (
    <div className="sc">
      <div className="sc-banner">
        ⚠️ 엔진 <code>{ENGINE_VERSION}</code> — 수식은 논문 개정 완료 후
        동결본으로 교체됩니다. 수치는 구조 시연용이지 처방이 아닙니다.
      </div>

      <div className="sc-grid">
        <div className="sc-panel">
          <h3>사업부 파라미터 (임의값)</h3>
          <div className="sc-tabs">
            {divs.map((d, i) => (
              <button
                key={d.name}
                className={i === sel ? 'sc-tab active' : 'sc-tab'}
                onClick={() => setSel(i)}
              >
                <span className="dot" style={{ background: DIV_COLORS[i] }} />
                {d.name}
              </button>
            ))}
          </div>
          <div className="sc-sliders">
            {PARAM_META.map((m) => (
              <label key={m.key}>
                <span className="sc-param">{m.label}</span>
                <input
                  type="range"
                  min={m.min}
                  max={m.max}
                  step={m.step}
                  value={divs[sel][m.key]}
                  onChange={(e) => setParam(m.key, Number(e.target.value))}
                />
                <span className="sc-val">{divs[sel][m.key].toFixed(2)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="sc-panel">
          <h3>최적 공시강도 d*</h3>
          <div className="sc-chart">
            {divs.map((d, i) => (
              <div key={d.name} className="sc-row">
                <span className="sc-name">{d.name}</span>
                <Bar frac={solutions[i].dStar / (dMax * 1.15)} color={DIV_COLORS[i]} />
                <span className="sc-num">{solutions[i].dStar.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <h3>최적 헤지비율 h*</h3>
          <div className="sc-chart">
            {divs.map((d, i) => (
              <div key={d.name} className="sc-row">
                <span className="sc-name">{d.name}</span>
                <Bar frac={solutions[i].hStar} color={DIV_COLORS[i]} />
                <span className="sc-num">{(solutions[i].hStar * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>

          <div className="sc-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>사업부</th>
                  <th className="num">d*</th>
                  <th className="num">h*</th>
                  <th className="num">Λ(d*)</th>
                  <th className="num">페널티 절감</th>
                  <th className="num">공시 비용</th>
                </tr>
              </thead>
              <tbody>
                {divs.map((d, i) => (
                  <tr key={d.name} className={i === sel ? 'hl' : ''}>
                    <td>
                      <span className="dot" style={{ background: DIV_COLORS[i] }} /> {d.name}
                    </td>
                    <td className="num">{solutions[i].dStar.toFixed(2)}</td>
                    <td className="num">{(solutions[i].hStar * 100).toFixed(1)}%</td>
                    <td className="num">{solutions[i].lambdaAtD.toFixed(2)}</td>
                    <td className="num">{solutions[i].penaltySaved.toFixed(1)}</td>
                    <td className="num">{solutions[i].discCost.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="sc-note">
        읽는 법: 노출(R)이 크고 페널티 감쇠(k)가 빠른 사업부일수록 공시(d*)를
        많이 하는 게 최적이고, 공시가 그림자가격 Λ를 낮추면 잔존위험을 안는
        비용이 줄어 헤지비율(h*)도 함께 움직인다 — 공시와 헤지가 한 문제의 두
        해라는 것이 홍ERP의 논지다. 슬라이더로 직접 확인해보라.
      </p>
    </div>
  )
}
