import { useMemo, useState } from 'react'
import { solveEquilibrium, type ModelParams } from '../engine/model'
import { useErp } from '../state/erp'
import ParamRow from '../components/ParamRow'
import './Scenario.css'

// Division colors — validated palette, assigned to entities in fixed order;
// a division keeps its color across every chart.
const DIV_COLORS = ['#2e7d52', '#2f6db4', '#b3610f']

const PARAM_META: { key: keyof ModelParams; label: string; min: number; max: number; step: number }[] = [
  { key: 'lambda', label: 'λ stringency', min: 0, max: 12, step: 0.25 },
  { key: 'k', label: 'k attenuation', min: 0.1, max: 2, step: 0.05 },
  { key: 'a', label: 'a disclosure cost', min: 0.2, max: 5, step: 0.1 },
  { key: 'phi', label: 'φ distress price', min: 0, max: 3, step: 0.05 },
  { key: 'sigmaF', label: 'σf financial vol', min: 0.2, max: 3, step: 0.05 },
  { key: 'pF', label: 'p_f hedge premium', min: 0.05, max: 4, step: 0.05 },
  { key: 'dFloor', label: 'd̲ mandated floor', min: 0, max: 5, step: 0.1 },
]

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
  const { state: erp, dispatch } = useErp()
  const divs = erp.divisions
  const [sel, setSel] = useState(0)

  const solutions = useMemo(() => divs.map((d) => solveEquilibrium(d.params)), [divs])
  const dMax = Math.max(...solutions.map((s) => s.dStar), 0.1)

  const setParam = (key: keyof ModelParams, value: number) =>
    dispatch({ type: 'setDivisionParams', id: divs[sel].id, params: { ...divs[sel].params, [key]: value } })

  return (
    <div className="sc">
      <div className="sc-grid">
        <div className="sc-panel">
          <h3>Division parameters</h3>
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
              <ParamRow
                key={m.key}
                label={m.label}
                min={m.min}
                max={m.max}
                step={m.step}
                value={divs[sel].params[m.key]}
                onChange={(v) => setParam(m.key, v)}
              />
            ))}
          </div>
          <p className="sc-fixed-note">
            These are the divisions' live parameter records — edits persist
            and flow to the division book on the Decision Dashboard.
          </p>
        </div>

        <div className="sc-panel">
          <h3>Optimal disclosure d*</h3>
          <div className="sc-chart">
            {divs.map((d, i) => (
              <div key={d.name} className="sc-row">
                <span className="sc-name">{d.name}</span>
                <Bar frac={solutions[i].dStar / (dMax * 1.15)} color={DIV_COLORS[i]} />
                <span className="sc-num">{solutions[i].dStar.toFixed(2)}</span>
              </div>
            ))}
          </div>

          <h3>Optimal financial hedge h_f*</h3>
          <div className="sc-chart">
            {divs.map((d, i) => (
              <div key={d.name} className="sc-row">
                <span className="sc-name">{d.name}</span>
                <Bar frac={solutions[i].hF} color={DIV_COLORS[i]} />
                <span className="sc-num">{(solutions[i].hF * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>

          <div className="sc-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Division</th>
                  <th className="num">d*</th>
                  <th className="num">h_f*</th>
                  <th className="num">h_c*</th>
                  <th className="num">Λ(d*)</th>
                  <th>Regime</th>
                </tr>
              </thead>
              <tbody>
                {divs.map((d, i) => (
                  <tr key={d.name} className={i === sel ? 'hl' : ''}>
                    <td>
                      <span className="dot" style={{ background: DIV_COLORS[i] }} /> {d.name}
                    </td>
                    <td className="num">{solutions[i].dStar.toFixed(2)}</td>
                    <td className="num">{(solutions[i].hF * 100).toFixed(1)}%</td>
                    <td className="num">{(solutions[i].hC * 100).toFixed(1)}%</td>
                    <td className="num">{solutions[i].lambdaAtD.toFixed(2)}</td>
                    <td>{solutions[i].floorBinding ? 'floor binding' : 'voluntary'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="sc-note">
        How to read it: divisions with larger exposure (σf) and faster penalty
        attenuation (k) optimally disclose more, and because disclosure lowers
        the shadow price Λ of residual risk, their hedge ratios move with it —
        disclosure and hedging are two solutions of one problem. Try raising a
        division's mandated floor d̲ past its voluntary d* and watch the hedge
        fall: that is the crowding-out regime.
      </p>
    </div>
  )
}
