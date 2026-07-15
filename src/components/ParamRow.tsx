// One parameter row: serif-italic math symbol, muted description, filled-track
// slider, and an accent value chip. Shared by every control deck so they read
// and behave identically. A plain-English tooltip explains each symbol for
// readers without a finance background.
import type { CSSProperties } from 'react'

// keyed by the descriptor that follows the symbol in the label
const HELP: Record<string, string> = {
  'financial vol': 'How much the oil / financial price swings',
  'climate vol': 'How much the climate exposure swings',
  correlation: 'How much the two risks move together',
  financial: 'Cost to hedge the financial (oil) leg',
  climate: 'Cost to hedge the climate leg',
  'hedge premium': 'Cost to hedge the financial leg',
  'disclosure cost': 'How expensive disclosure is for this firm',
  'distress price': 'Baseline price the firm puts on residual risk',
  stringency: 'How strict the disclosure regime is',
  attenuation: 'How fast disclosure relieves the penalty',
  'mandated floor': 'Regulator-required minimum disclosure',
  forward: 'Expected future oil price',
  volatility: 'How much the price swings',
  maturity: 'Time until the option expires',
  rate: 'Risk-free interest rate',
  'cap strike': 'Ceiling price the collar locks in',
  budget: 'Total premium you can spend',
  'stress WTI': 'Oil price in the stress scenario',
}

export default function ParamRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  fmt,
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  fmt?: (v: number) => string
}) {
  const [sym, ...rest] = label.split(' ')
  const desc = rest.join(' ')
  // render "p_f" / "h_c" with a true subscript so the math reads like a paper
  const [base, subMark] = sym.split('_')
  const fill = `${((value - min) / (max - min)) * 100}%`
  const help = HELP[desc]
  return (
    <label className="param-row">
      <span className="param-name" title={help ?? undefined}>
        <span className="p-sym">
          {base}
          {subMark && <sub className="p-sub">{subMark}</sub>}
        </span>
        <span className="p-desc">{desc}</span>
      </span>
      <input
        type="range"
        className="fancy"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={help ? `${desc} — ${help}` : desc}
        style={{ '--f': fill } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="p-val">{fmt ? fmt(value) : value.toFixed(2)}</span>
    </label>
  )
}
