import './AppPreview.css'

// The hero stage: a browser-framed miniature of the Decision Dashboard —
// the product's best asset, shown instead of stock scenery. Purely presentational
// (the live screen is one click away via the CTA); the h(d) curve and tiles use
// the real palette and the real equilibrium story (both hedge ratios fall as
// disclosure rises). Decorative, hidden from a11y.
const C_FIN = '#2f6db4'
const C_CLI = '#2e7d52'

// a gently descending pair of hedge curves, sampled for the sparkline
const W = 320
const H = 150
const PAD = { t: 12, r: 46, b: 20, l: 10 }
const curve = (a: number, k: number) =>
  Array.from({ length: 41 }, (_, i) => {
    const t = i / 40
    const x = PAD.l + t * (W - PAD.l - PAD.r)
    const h = a * Math.exp(-k * t)
    const y = PAD.t + (1 - h) * (H - PAD.t - PAD.b)
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
  }).join('')

const finP = curve(0.82, 0.5)
const cliP = curve(0.72, 0.9)
const dotX = PAD.l + 0.42 * (W - PAD.l - PAD.r)
const finDotY = PAD.t + (1 - 0.82 * Math.exp(-0.5 * 0.42)) * (H - PAD.t - PAD.b)
const cliDotY = PAD.t + (1 - 0.72 * Math.exp(-0.9 * 0.42)) * (H - PAD.t - PAD.b)

export default function AppPreview() {
  return (
    <div className="ap" aria-hidden>
      <div className="ap-window">
        <div className="ap-bar">
          <span className="ap-dot" />
          <span className="ap-dot" />
          <span className="ap-dot" />
          <span className="ap-url">Decision Dashboard · d* × h*</span>
        </div>
        <div className="ap-body">
          <div className="ap-tiles">
            <div className="ap-tile">
              <span className="ap-tl">Disclosure d*</span>
              <span className="ap-tv">0.83</span>
            </div>
            <div className="ap-tile">
              <span className="ap-tl">Financial h_f*</span>
              <span className="ap-tv" style={{ color: C_FIN }}>68%</span>
            </div>
            <div className="ap-tile">
              <span className="ap-tl">Climate h_c*</span>
              <span className="ap-tv" style={{ color: C_CLI }}>46%</span>
            </div>
          </div>
          <div className="ap-chart">
            <div className="ap-chart-h">Hedge ratios as disclosure varies — h(d)</div>
            <svg viewBox={`0 0 ${W} ${H}`} className="ap-svg">
              {[0.25, 0.5, 0.75].map((f) => (
                <line
                  key={f}
                  x1={PAD.l}
                  y1={PAD.t + f * (H - PAD.t - PAD.b)}
                  x2={W - PAD.r}
                  y2={PAD.t + f * (H - PAD.t - PAD.b)}
                  stroke="var(--line)"
                  strokeWidth={1}
                />
              ))}
              <line x1={dotX} y1={PAD.t} x2={dotX} y2={H - PAD.b} stroke="var(--muted)" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
              <path d={finP} fill="none" stroke={C_FIN} strokeWidth={2.4} />
              <path d={cliP} fill="none" stroke={C_CLI} strokeWidth={2.4} />
              <text x={W - PAD.r + 5} y={PAD.t + (1 - 0.82 * Math.exp(-0.5)) * (H - PAD.t - PAD.b) + 4} fill={C_FIN} className="ap-lbl">financial</text>
              <text x={W - PAD.r + 5} y={PAD.t + (1 - 0.72 * Math.exp(-0.9)) * (H - PAD.t - PAD.b) + 4} fill={C_CLI} className="ap-lbl">climate</text>
              <circle cx={dotX} cy={finDotY} r={4} fill={C_FIN} stroke="#fff" strokeWidth={2} />
              <circle cx={dotX} cy={cliDotY} r={4} fill={C_CLI} stroke="#fff" strokeWidth={2} />
            </svg>
          </div>
        </div>
      </div>
      <div className="ap-caption">Live equilibrium — both hedge ratios fall as disclosure rises</div>
    </div>
  )
}
