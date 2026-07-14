import { useMemo, useState } from 'react'
import {
  IRO_ITEMS,
  IRO_TYPE_LABELS,
  PILLAR_COLORS,
  type IroItem,
  type IroType,
} from '../data/iro'
import './Materiality.css'

// SVG 좌표계: viewBox 고정, CSS로 반응형 축소
const W = 560
const H = 460
const PAD = { top: 16, right: 16, bottom: 44, left: 48 }
const MIN = 1
const MAX = 5

const x = (v: number) => PAD.left + ((v - MIN) / (MAX - MIN)) * (W - PAD.left - PAD.right)
const y = (v: number) => H - PAD.bottom - ((v - MIN) / (MAX - MIN)) * (H - PAD.top - PAD.bottom)

// 유형은 색이 아니라 도형으로 인코딩 (2차 인코딩 — CVD·흑백 대비)
function Marker({ item, sel }: { item: IroItem; sel: boolean }) {
  const cx = x(item.financial)
  const cy = y(item.impact)
  const c = PILLAR_COLORS[item.pillar]
  const common = {
    fill: c,
    stroke: 'var(--panel)',
    strokeWidth: 2, // 겹침 대비 2px 서피스 링
  }
  const r = sel ? 8 : 6
  if (item.type === 'opportunity')
    return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} rx={2} {...common} />
  if (item.type === 'impact')
    return (
      <polygon
        points={`${cx},${cy - r * 1.2} ${cx - r * 1.1},${cy + r * 0.9} ${cx + r * 1.1},${cy + r * 0.9}`}
        {...common}
      />
    )
  return <circle cx={cx} cy={cy} r={r} {...common} />
}

export default function Materiality() {
  const [threshold, setThreshold] = useState(3.5)
  const [hover, setHover] = useState<IroItem | null>(null)

  const material = useMemo(
    () => IRO_ITEMS.filter((i) => i.financial >= threshold || i.impact >= threshold),
    [threshold],
  )
  const isMaterial = (i: IroItem) => i.financial >= threshold || i.impact >= threshold

  return (
    <div className="mat">
      <div className="mat-controls">
        <label>
          중대성 기준선 <strong>{threshold.toFixed(1)}</strong>
          <input
            type="range"
            min={1.5}
            max={4.5}
            step={0.1}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
        </label>
        <span className="mat-count">
          중대 이슈 <strong>{material.length}</strong> / {IRO_ITEMS.length}
        </span>
      </div>

      <div className="mat-grid">
        <figure className="mat-plot">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="이중 중대성 매트릭스">
            {/* 중대 구역 음영 — 재무≥기준(우측 열) ∪ 영향≥기준(상단 밴드).
                SVG y축은 아래로 증가하므로 '영향≥기준'은 y(threshold) 위쪽이다 */}
            <path
              d={`M ${PAD.left} ${PAD.top} H ${W - PAD.right} V ${H - PAD.bottom} H ${x(threshold)} V ${y(threshold)} H ${PAD.left} Z`}
              fill="var(--accent)"
              opacity={0.06}
            />
            {/* 그리드 (recessive) */}
            {[1, 2, 3, 4, 5].map((v) => (
              <g key={v}>
                <line x1={x(v)} y1={PAD.top} x2={x(v)} y2={H - PAD.bottom} stroke="var(--line)" strokeWidth={1} />
                <line x1={PAD.left} y1={y(v)} x2={W - PAD.right} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
                <text x={x(v)} y={H - PAD.bottom + 18} textAnchor="middle" className="tick">{v}</text>
                <text x={PAD.left - 10} y={y(v) + 4} textAnchor="end" className="tick">{v}</text>
              </g>
            ))}
            {/* 기준선 */}
            <line x1={x(threshold)} y1={PAD.top} x2={x(threshold)} y2={H - PAD.bottom} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 4" />
            <line x1={PAD.left} y1={y(threshold)} x2={W - PAD.right} y2={y(threshold)} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 4" />

            {/* 축 제목 (텍스트는 텍스트 토큰) */}
            <text x={(PAD.left + W - PAD.right) / 2} y={H - 8} textAnchor="middle" className="axis-title">재무적 중대성 →</text>
            <text x={14} y={(PAD.top + H - PAD.bottom) / 2} textAnchor="middle" className="axis-title" transform={`rotate(-90 14 ${(PAD.top + H - PAD.bottom) / 2})`}>영향 중대성 →</text>

            {/* 마커 + 중대 이슈만 선택적 직접 라벨 */}
            {IRO_ITEMS.map((item) => (
              <g
                key={item.id}
                className="mark"
                onMouseEnter={() => setHover(item)}
                onMouseLeave={() => setHover(null)}
              >
                {/* 히트 타깃은 마크보다 크게 */}
                <circle cx={x(item.financial)} cy={y(item.impact)} r={14} fill="transparent" />
                <Marker item={item} sel={hover?.id === item.id} />
                {isMaterial(item) && (
                  <text x={x(item.financial) + 10} y={y(item.impact) - 8} className="mark-label">
                    {item.id.replace('IRO-', '')}
                  </text>
                )}
              </g>
            ))}
          </svg>

          {hover && (
            <div
              className="mat-tooltip"
              style={{
                left: `${(x(hover.financial) / W) * 100}%`,
                top: `${(y(hover.impact) / H) * 100}%`,
              }}
            >
              <strong>{hover.id}</strong> {hover.name}
              <div className="tt-row">
                <span className="dot" style={{ background: PILLAR_COLORS[hover.pillar] }} />
                {hover.pillar} · {IRO_TYPE_LABELS[hover.type]} · 재무 {hover.financial.toFixed(1)} · 영향 {hover.impact.toFixed(1)}
              </div>
              {hover.note && <div className="tt-note">{hover.note}</div>}
            </div>
          )}

          <figcaption className="mat-legend">
            {(['E', 'S', 'G'] as const).map((p) => (
              <span key={p} className="lg-item">
                <span className="dot" style={{ background: PILLAR_COLORS[p] }} />
                {p === 'E' ? '환경' : p === 'S' ? '사회' : '지배구조'}
              </span>
            ))}
            <span className="lg-sep" />
            {(Object.keys(IRO_TYPE_LABELS) as IroType[]).map((t) => (
              <span key={t} className="lg-item shape">
                <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden>
                  {t === 'risk' && <circle cx="8" cy="8" r="6" fill="var(--muted)" />}
                  {t === 'opportunity' && <rect x="2" y="2" width="12" height="12" rx="2" fill="var(--muted)" />}
                  {t === 'impact' && <polygon points="8,1 1,14 15,14" fill="var(--muted)" />}
                </svg>
                {IRO_TYPE_LABELS[t]}
              </span>
            ))}
          </figcaption>
        </figure>

        <div className="mat-table-wrap">
          <table>
            <thead>
              <tr>
                <th>코드</th>
                <th>이슈</th>
                <th>필라</th>
                <th>유형</th>
                <th className="num">재무</th>
                <th className="num">영향</th>
                <th>판정</th>
              </tr>
            </thead>
            <tbody>
              {[...IRO_ITEMS]
                .sort((a, b) => Math.max(b.financial, b.impact) - Math.max(a.financial, a.impact))
                .map((i) => (
                  <tr
                    key={i.id}
                    className={hover?.id === i.id ? 'hl' : ''}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <td><code>{i.id}</code></td>
                    <td>{i.name}</td>
                    <td>
                      <span className="dot" style={{ background: PILLAR_COLORS[i.pillar] }} /> {i.pillar}
                    </td>
                    <td>{IRO_TYPE_LABELS[i.type]}</td>
                    <td className="num">{i.financial.toFixed(1)}</td>
                    <td className="num">{i.impact.toFixed(1)}</td>
                    <td>{isMaterial(i) ? <strong className="mat-yes">중대</strong> : <span className="mat-no">—</span>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mat-note">
        데모 IRO 등록부(가상 제조업 가정). 판정 규칙: 재무·영향 중 하나라도
        기준선 이상이면 중대(이중 중대성의 합집합 방식). 홍ERP의 다음 연결:
        중대 판정된 <em>리스크</em>는 결정 대시보드의 노출 파라미터(R, Σ)로
        넘어가 최적 공시강도 d*·헤지 h* 계산에 들어간다 — 설문 점수에서 끝나는
        기존 솔루션과의 차이.
      </p>
    </div>
  )
}
