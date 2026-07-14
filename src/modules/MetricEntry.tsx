import { useMemo, useState } from 'react'
import { TAXONOMY, type Datapoint } from '../data/taxonomy'
import { Chip, useSpine } from '../state/spine'
import './MetricEntry.css'

// Metrics-entry mockup — state lives in browser memory only (no backend).
// What it demonstrates: values must pass validation rules before they can
// enter the approval chain.

interface Row {
  year: number
  value: string // kept as typed; parsed at validation
  evidence: boolean
}

type Stage = 'draft' | 'review' | 'approved'

const YEARS = [2024, 2025, 2026]

const STAGE_LABELS: Record<Stage, string> = {
  draft: 'Draft',
  review: 'Review',
  approved: 'Approved',
}

function flatDatapoints(): { dp: Datapoint; path: string }[] {
  const out: { dp: Datapoint; path: string }[] = []
  for (const p of TAXONOMY)
    for (const c of p.categories)
      for (const a of c.accounts)
        for (const dp of a.datapoints)
          out.push({ dp, path: `${p.name} › ${c.name} › ${a.name}` })
  return out
}

const ALL_DPS = flatDatapoints()

interface Violation {
  level: 'error' | 'warn'
  msg: string
}

// Validation rules — three demo rules. A real product keys these per datapoint.
function validate(rows: Row[]): Violation[] {
  const v: Violation[] = []
  const nums = rows.map((r) => (r.value.trim() === '' ? null : Number(r.value)))

  rows.forEach((r, i) => {
    if (r.value.trim() === '') {
      v.push({ level: 'error', msg: `${r.year}: value is empty` })
      return
    }
    const n = nums[i]
    if (n === null || Number.isNaN(n))
      v.push({ level: 'error', msg: `${r.year}: value is not a number` })
    else if (n < 0) v.push({ level: 'error', msg: `${r.year}: negative — absolute metrics cannot be negative` })
    if (!r.evidence) v.push({ level: 'error', msg: `${r.year}: no evidence attached — unevidenced values cannot be submitted` })
  })

  for (let i = 1; i < rows.length; i++) {
    const prev = nums[i - 1]
    const cur = nums[i]
    if (prev != null && cur != null && !Number.isNaN(prev) && !Number.isNaN(cur) && prev > 0) {
      const chg = (cur - prev) / prev
      if (Math.abs(chg) > 0.5)
        v.push({
          level: 'warn',
          msg: `${rows[i].year}: ${(chg * 100).toFixed(0)}% change vs prior year — explanation required`,
        })
    }
  }
  return v
}

export default function MetricEntry() {
  const spine = useSpine()
  const [dpCode, setDpCode] = useState(ALL_DPS[0].dp.code)
  const [rows, setRows] = useState<Row[]>(
    YEARS.map((year) => ({ year, value: '', evidence: false })),
  )
  const [stage, setStage] = useState<Stage>('draft')

  const sel = ALL_DPS.find((d) => d.dp.code === dpCode)!
  const violations = useMemo(() => validate(rows), [rows])
  const errors = violations.filter((v) => v.level === 'error')

  const setRow = (i: number, patch: Partial<Row>) => {
    setStage('draft') // any change restarts the approval chain
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  }

  const pickDp = (code: string) => {
    setDpCode(code)
    setRows(YEARS.map((year) => ({ year, value: '', evidence: false })))
    setStage('draft')
  }

  return (
    <div className="me">
      <div className="spine-row">
        <Chip from="Decision Dashboard">
          approved values feed disclosure intensity — current target d* = <strong>{spine.dStar.toFixed(2)}</strong>{spine.floorBinding ? ' (floor binding)' : ''}
        </Chip>
      </div>
      <div className="me-head">
        <label className="me-select">
          Datapoint
          <select value={dpCode} onChange={(e) => pickDp(e.target.value)}>
            {ALL_DPS.map(({ dp }) => (
              <option key={dp.code} value={dp.code}>
                {dp.code} · {dp.name}
              </option>
            ))}
          </select>
        </label>
        <div className="me-path">
          {sel.path} {sel.dp.unit && <span className="me-unit">Unit: {sel.dp.unit}</span>}
        </div>
      </div>

      <div className="me-grid">
        <div className="me-panel">
          <h3>Annual values</h3>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Value {sel.dp.unit && `(${sel.dp.unit})`}</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.year}>
                  <td>{r.year}</td>
                  <td>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={r.value}
                      placeholder="0"
                      disabled={stage === 'approved'}
                      onChange={(e) => setRow(i, { value: e.target.value })}
                    />
                  </td>
                  <td>
                    <label className="me-evidence">
                      <input
                        type="checkbox"
                        checked={r.evidence}
                        disabled={stage === 'approved'}
                        onChange={(e) => setRow(i, { evidence: e.target.checked })}
                      />
                      Attached (mockup)
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="me-validations">
            {violations.length === 0 ? (
              <p className="ok">✓ All 3 validation rules pass</p>
            ) : (
              violations.map((v, i) => (
                <p key={i} className={v.level}>
                  {v.level === 'error' ? '✕' : '△'} {v.msg}
                </p>
              ))
            )}
          </div>
        </div>

        <div className="me-panel">
          <h3>Approval</h3>
          <ol className="me-stepper">
            {(['draft', 'review', 'approved'] as Stage[]).map((s, i) => {
              const idx = ['draft', 'review', 'approved'].indexOf(stage)
              const state = i < idx ? 'done' : i === idx ? 'now' : 'todo'
              return (
                <li key={s} className={state}>
                  <span className="step-dot">{i + 1}</span>
                  {STAGE_LABELS[s]}
                </li>
              )
            })}
          </ol>

          {stage === 'draft' && (
            <button
              className="me-btn"
              disabled={errors.length > 0}
              onClick={() => setStage('review')}
            >
              Request review
            </button>
          )}
          {stage === 'review' && (
            <div className="me-btnrow">
              <button className="me-btn" onClick={() => setStage('approved')}>
                Approve
              </button>
              <button className="me-btn ghost" onClick={() => setStage('draft')}>
                Reject
              </button>
            </div>
          )}
          {stage === 'approved' && (
            <p className="me-approved">
              Approved — values are locked. Changing them requires drafting a
              new version (an audit-trail concept, mocked).
            </p>
          )}
          {stage === 'draft' && errors.length > 0 && (
            <p className="me-hint">Resolve {errors.length} error(s) to request review.</p>
          )}
        </div>
      </div>

      <p className="me-note">
        Three demo validation rules: numeric/negative checks, mandatory evidence,
        ±50% year-over-year change warning. This layer is exactly what incumbent
        solutions' quantitative modules do — HongERP does not stop here: approved
        values feed the Decision Dashboard as inputs.
      </p>
    </div>
  )
}
