import { useEffect, useMemo, useState } from 'react'
import {
  IRO_ITEMS,
  IRO_TYPE_LABELS,
  PILLAR_COLORS,
  PILLAR_LABELS,
  type IroItem,
  type IroType,
} from '../data/iro'
import { useSpine } from '../state/spine'
import './Materiality.css'

// fixed viewBox, responsive via CSS
const W = 560
const H = 460
const PAD = { top: 16, right: 16, bottom: 44, left: 48 }
const MIN = 1
const MAX = 5

const x = (v: number) => PAD.left + ((v - MIN) / (MAX - MIN)) * (W - PAD.left - PAD.right)
const y = (v: number) => H - PAD.bottom - ((v - MIN) / (MAX - MIN)) * (H - PAD.top - PAD.bottom)

// type is encoded by shape, not color (secondary encoding for CVD / print)
function Marker({ item, sel }: { item: IroItem; sel: boolean }) {
  const cx = x(item.financial)
  const cy = y(item.impact)
  const c = PILLAR_COLORS[item.pillar]
  const common = {
    fill: c,
    stroke: 'var(--panel)',
    strokeWidth: 2, // 2px surface ring against overlaps
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
  const spine = useSpine()

  const material = useMemo(
    () => IRO_ITEMS.filter((i) => i.financial >= threshold || i.impact >= threshold),
    [threshold],
  )
  const isMaterial = (i: IroItem) => i.financial >= threshold || i.impact >= threshold

  useEffect(() => {
    spine.publish({ materialCount: material.length, materialityThreshold: threshold })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [material.length, threshold])

  return (
    <div className="mat">
      <div className="mat-controls">
        <label>
          Materiality threshold <strong>{threshold.toFixed(1)}</strong>
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
          Material issues <strong>{material.length}</strong> / {IRO_ITEMS.length}
        </span>
      </div>

      <div className="mat-grid">
        <figure className="mat-plot">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Double materiality matrix">
            {/* material zone — financial≥t (right column) ∪ impact≥t (top band);
                SVG y grows downward, so impact≥t is ABOVE y(threshold) */}
            <path
              d={`M ${PAD.left} ${PAD.top} H ${W - PAD.right} V ${H - PAD.bottom} H ${x(threshold)} V ${y(threshold)} H ${PAD.left} Z`}
              fill="var(--accent)"
              opacity={0.06}
            />
            {/* grid (recessive) */}
            {[1, 2, 3, 4, 5].map((v) => (
              <g key={v}>
                <line x1={x(v)} y1={PAD.top} x2={x(v)} y2={H - PAD.bottom} stroke="var(--line)" strokeWidth={1} />
                <line x1={PAD.left} y1={y(v)} x2={W - PAD.right} y2={y(v)} stroke="var(--line)" strokeWidth={1} />
                <text x={x(v)} y={H - PAD.bottom + 18} textAnchor="middle" className="tick">{v}</text>
                <text x={PAD.left - 10} y={y(v) + 4} textAnchor="end" className="tick">{v}</text>
              </g>
            ))}
            {/* thresholds */}
            <line x1={x(threshold)} y1={PAD.top} x2={x(threshold)} y2={H - PAD.bottom} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 4" />
            <line x1={PAD.left} y1={y(threshold)} x2={W - PAD.right} y2={y(threshold)} stroke="var(--accent)" strokeWidth={1.5} strokeDasharray="4 4" />

            {/* axis titles (text wears text tokens) */}
            <text x={(PAD.left + W - PAD.right) / 2} y={H - 8} textAnchor="middle" className="axis-title">Financial materiality →</text>
            <text x={14} y={(PAD.top + H - PAD.bottom) / 2} textAnchor="middle" className="axis-title" transform={`rotate(-90 14 ${(PAD.top + H - PAD.bottom) / 2})`}>Impact materiality →</text>

            {/* marks; selective direct labels on material issues only */}
            {IRO_ITEMS.map((item) => (
              <g
                key={item.id}
                className="mark"
                onMouseEnter={() => setHover(item)}
                onMouseLeave={() => setHover(null)}
              >
                {/* hit target larger than the mark */}
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
                {hover.pillar} · {IRO_TYPE_LABELS[hover.type]} · Fin {hover.financial.toFixed(1)} · Imp {hover.impact.toFixed(1)}
              </div>
              {hover.note && <div className="tt-note">{hover.note}</div>}
            </div>
          )}

          <figcaption className="mat-legend">
            {(['E', 'S', 'G'] as const).map((p) => (
              <span key={p} className="lg-item">
                <span className="dot" style={{ background: PILLAR_COLORS[p] }} />
                {PILLAR_LABELS[p]}
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
                <th>#</th>
                <th>Issue</th>
                <th>P</th>
                <th className="num">Fin</th>
                <th className="num">Imp</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {[...IRO_ITEMS]
                .sort((a, b) => Math.max(b.financial, b.impact) - Math.max(a.financial, a.impact))
                .map((i) => (
                  <tr
                    key={i.id}
                    className={`${isMaterial(i) ? 'mat-row' : ''} ${hover?.id === i.id ? 'hl' : ''}`}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <td><code>{i.id.replace('IRO-', '')}</code></td>
                    <td>
                      {i.name}
                      <span className="mat-type"> · {IRO_TYPE_LABELS[i.type]}</span>
                    </td>
                    <td>
                      <span className="dot" style={{ background: PILLAR_COLORS[i.pillar] }} title={PILLAR_LABELS[i.pillar]} /> {i.pillar}
                    </td>
                    <td className="num">{i.financial.toFixed(1)}</td>
                    <td className="num">{i.impact.toFixed(1)}</td>
                    <td>{isMaterial(i) ? <span className="mat-badge">Material</span> : <span className="mat-no">—</span>}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mat-note">
        Demo IRO register (hypothetical manufacturer). Verdict rule: material if
        either financial or impact score clears the threshold (the union reading
        of double materiality). Where HongERP goes further: <em>risks</em> judged
        material feed the Decision Dashboard as exposure parameters (Σ), entering
        the computation of optimal disclosure d* and hedge h* — instead of ending
        life as a survey score.
      </p>
    </div>
  )
}
