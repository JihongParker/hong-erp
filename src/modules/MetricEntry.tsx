import { useMemo, useState } from 'react'
import { TAXONOMY, type Datapoint } from '../data/taxonomy'
import { Chip, useSpine } from '../state/spine'
import { timeAgo, useErp } from '../state/erp'
import Activity from '../components/Activity'
import { useToast } from '../components/Toast'
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
  const toast = useToast()
  // queue items collapse+fade out before they leave the ledger, not snap away
  const [leaving, setLeaving] = useState<Record<string, boolean>>({})
  const review = (id: string, status: 'approved' | 'rejected') => {
    if (leaving[id]) return
    setLeaving((l) => ({ ...l, [id]: true }))
    setTimeout(() => {
      dispatch({ type: 'reviewMetric', id, status, actor: 'J. Kim (audit)' })
      setLeaving((l) => {
        const n = { ...l }
        delete n[id]
        return n
      })
    }, 240)
  }

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
    toast(`Submitted — ${sel.dp.name} FY${year} is now in the approval queue`)
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
        <div className="me-panel" data-tour="me-submit">
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
              <input
                type="text"
                inputMode="decimal"
                value={value}
                placeholder="0"
                aria-invalid={value.trim() !== '' && !numeric}
                onChange={(e) => setValue(e.target.value)}
              />
            </label>
            <label className="me-evidence">
              <input type="checkbox" checked={evidence} onChange={(e) => setEvidence(e.target.checked)} />
              Evidence attached (mockup)
            </label>
          </div>
          {!numeric && value.trim() !== '' && <p className="me-err">✕ Value must be a non-negative number</p>}
          <button
            className="me-btn"
            disabled={!canSubmit}
            title={!canSubmit ? (!numeric ? 'Enter a non-negative number' : 'Attach evidence to submit') : undefined}
            onClick={submit}
          >
            Submit for review
          </button>
          <p className="me-note">
            Submitted as {div.head} ({div.name}). Approved values feed the
            division's exposure parameters and the firm's disclosure intensity.
          </p>
        </div>

        {/* ── approval queue + heartbeat ── */}
        <div className="me-panel" data-tour="me-queue">
          <h3>
            Approval queue <span className="me-count">{pending.length}</span>
          </h3>
          {pending.length === 0 ? (
            <p className="me-empty">Queue is clear.</p>
          ) : (
            pending.map((m) => (
              <div key={m.id} className={leaving[m.id] ? 'me-qslot leaving' : 'me-qslot'}>
                <div className="me-qitem">
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
                    <button className="me-btn sm" onClick={() => review(m.id, 'approved')}>
                      Approve
                    </button>
                    <button className="me-btn sm ghost" onClick={() => review(m.id, 'rejected')}>
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
          <h3 className="me-h3gap">Recent activity</h3>
          <Activity limit={5} />
        </div>

        {/* ── division ledger: compact list, fits its column ── */}
        <div className="me-panel">
          <h3>{div.name} submission ledger</h3>
          <div className="me-ledger">
            {ledger.map((m) => (
              <div key={m.id} className="me-lrow">
                <div className="me-lmain">
                  <span className="me-lname">{m.name}</span>
                  <span className={`me-status ${m.status}`}>{STATUS_LABEL[m.status]}</span>
                </div>
                <div className="me-lmeta">
                  <span className="me-lval">
                    {m.value.toLocaleString()} {m.unit}
                  </span>
                  <span>FY{m.year} · {m.by} · {timeAgo(m.ts)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
