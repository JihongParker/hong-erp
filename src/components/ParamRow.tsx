// One parameter row: serif-italic math symbol, muted description, filled-track
// slider, and an accent value chip. Shared by the Dashboard and Scenario decks
// so every control in the app reads and behaves identically.
import type { CSSProperties } from 'react'

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
  // render "p_f" / "h_c" with a true subscript so the math reads like a paper
  const [base, subMark] = sym.split('_')
  const fill = `${((value - min) / (max - min)) * 100}%`
  return (
    <label className="param-row">
      <span className="param-name">
        <span className="p-sym">
          {base}
          {subMark && <sub className="p-sub">{subMark}</sub>}
        </span>
        <span className="p-desc">{rest.join(' ')}</span>
      </span>
      <input
        type="range"
        className="fancy"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--f': fill } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="p-val">{fmt ? fmt(value) : value.toFixed(2)}</span>
    </label>
  )
}
