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
}: {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  const [sym, ...rest] = label.split(' ')
  const fill = `${((value - min) / (max - min)) * 100}%`
  return (
    <label className="param-row">
      <span className="param-name">
        <span className="p-sym">{sym}</span>
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
      <span className="p-val">{value.toFixed(2)}</span>
    </label>
  )
}
