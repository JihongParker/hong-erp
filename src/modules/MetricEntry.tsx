import { useMemo, useState } from 'react'
import { TAXONOMY, type Datapoint } from '../data/taxonomy'
import { Chip, useSpine } from '../state/spine'
import { timeAgo, useErp } from '../state/erp'
import Activity from '../components/Activity'
import './MetricEntry.css'

// Division-level metrics operations: submit → validation → approval queue →
// ledger. All records live in the ERP store (seeded history + your actions),
// and every step lands in the audit trail.

function flatDatapoints(): { dp: Datapoint; path: string }[] {
  const out: { dp: Datapoint; path: string }[] = []
  for (const p of TAXONOMY)
    for (const c of p.categories)
      for (const a of c.accounts)
        for (const dp of a.datapoints) out.push({ dp, path: `${p.name} › ${c.name} › ${a.name}` })
  return out
}
const ALL_DPS = flatDatapoints()

const STATUS_LABEL = { pending: 'Pending review', approved: 'Approved', rejected: 'Rejected' } as const

export default function MetricEntry() {
  const spine = useSpine()
  const { state, dispatch } = useErp()
  const [division, setDivision] = useState(state.divisions[0].id)
  const [dpCode, setDpCode] = useState(ALL_DPS[0].dp.code)
  const [year, setYear] = useState(2026)
  const [value, setValue] = useState('')
  const [evidence, setEvidence] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  const div = state.divisions.find((d) => d.id === division)!
  const sel = ALL_DPS.find((d) => d.dp.code === dpCode)!
  const numeric = value.trim() !== '' && !Number.isNaN(Number(value)) && Number(value) >= 0
  const canSubmit = numeric && evidence

  const pending = state.metrics.filter((m) => m.status === 'pending')
  const ledger = useMemo(
    () => state.metrics.filter((m) => m.division === division).slice(0, 8),
    [state.metrics, division],
  )

  const submit = () => {
    dispatch({
      type: 'submitMetric',
      rec: {
        division,
        datapoint: sel.dp.code,
        name: sel.dp.name,
        year,
        value: Number(value),
        unit: sel.dp.unit ?? '',
        by: div.head,
      },
    })
    setValue('')
    setEvidence(false)
    setFlash(`Submitted — ${sel.dp.name} FY${year} is now in the approval queue`)
    setTimeout(() => setFlash(null), 3500)
  }

  return (
    <div className="me">
      <div className="spine-row">
        <Chip from="Decision Dashboard">
          approved values feed disclosure intensity — current target d* = <strong>{spine.dStar.toFixed(2)}</strong>
        </Chip>
        <Chip from="Audit trail">
          <strong>{pending.length}</strong> submissions awaiting review across {state.divisions.length} divisions
        </Chip>
      </div>

      <div className="me-grid">
        {/* ── submit ── */}
        <div className="me-panel">
          <h3>New submission</h3>
          <div className="me-tabs">
            {state.divisions.map((d) => (
              <button key={d.id} className={d.id === division ? 'me-tab active' : 'me-tab'} onClick={() => setDivision(d.id)}>
                {d.name}
              </button>
            ))}
          </div>
          <label className="me-select">
            Datapoint
            <select value={dpCode} onChange={(e) => setDpCode(e.target.value)}>
              {ALL_DPS.map(({ dp }) => (
                <option key={dp.code} value={dp.code}>
                  {dp.code} · {dp.name}
                </option>
              ))}
            </select>
          </label>
          <p className="me-path">
            {sel.path} {sel.dp.unit && <span className="me-unit">Unit: {sel.dp.unit}</span>}
          </p>
          <div className="me-formrow">
            <label className="me-inline">
              Year
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {[2024, 2025, 2026].map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </label>
            <label className="me-inline">
              Value
              <input type="text" inputMode="decimal" value={value} placeholder="0" onChange={(e) => setValue(e.target.value)} />
            </label>
            <label className="me-evidence">
              <input type="checkbox" checked={evidence} onChange={(e) => setEvidence(e.target.checked)} />
              Evidence attached (mockup)
            </label>
          </div>
          {!numeric && value.trim() !== '' && <p className="me-err">✕ Value must be a non-negative number</p>}
          <button className="me-btn" disabled={!canSubmit} onClick={submit}>
            Submit for review
          </button>
          {flash && <p className="me-flash">✓ {flash}</p>}
          <p className="me-note">
            Submitted as {div.head} ({div.name}). Approved values feed the
            division's exposure parameters and the firm's disclosure intensity.
          </p>
        </div>

        {/* ── approval queue + heartbeat ── */}
        <div className="me-panel">
          <h3>
            Approval queue <span className="me-count">{pending.length}</span>
          </h3>
          {pending.length === 0 ? (
            <p className="me-empty">Queue is clear.</p>
          ) : (
            pending.map((m) => (
              <div key={m.id} className="me-qitem">
                <div className="me-qbody">
                  <strong>{state.divisions.find((d) => d.id === m.division)?.name}</strong> · {m.name} FY{m.year}
                  <span className="me-qval">
                    {m.value.toLocaleString()} {m.unit}
                  </span>
                  <span className="me-qmeta">
                    by {m.by} · {timeAgo(m.ts)}
                  </span>
                </div>
                <div className="me-qact">
                  <button className="me-btn sm" onClick={() => dispatch({ type: 'reviewMetric', id: m.id, status: 'approved', actor: 'J. Kim (audit)' })}>
                    Approve
                  </button>
                  <button className="me-btn sm ghost" onClick={() => dispatch({ type: 'reviewMetric', id: m.id, status: 'rejected', actor: 'J. Kim (audit)' })}>
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
          <h3 className="me-h3gap">Recent activity</h3>
          <Activity limit={5} />
        </div>

        {/* ── division ledger ── */}
        <div className="me-panel">
          <h3>{div.name} — submission ledger</h3>
        <div className="me-ledger">
          <table>
            <thead>
              <tr>
                <th>Datapoint</th>
                <th>FY</th>
                <th className="num">Value</th>
                <th>By</th>
                <th>When</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.year}</td>
                  <td className="num">
                    {m.value.toLocaleString()} <span className="me-unitsm">{m.unit}</span>
                  </td>
                  <td>{m.by}</td>
                  <td>{timeAgo(m.ts)}</td>
                  <td>
                    <span className={`me-status ${m.status}`}>{STATUS_LABEL[m.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  )
}
