import { useMemo, useRef, useState, type ChangeEvent } from 'react'
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
// code → datapoint, for validating CSV rows against the frozen taxonomy
const DP_BY_CODE = new Map(ALL_DPS.map(({ dp }) => [dp.code, dp]))

const STATUS_LABEL = { pending: 'Pending review', approved: 'Approved', rejected: 'Rejected' } as const

export default function MetricEntry() {
  const spine = useSpine()
  const { state, dispatch, role } = useErp()
  const [division, setDivision] = useState(state.divisions[0].id)
  const [dpCode, setDpCode] = useState(ALL_DPS[0].dp.code)
  const [year, setYear] = useState(2026)
  const [value, setValue] = useState('')
  const [evidence, setEvidence] = useState(false)
  const toast = useToast()
  // queue items collapse+fade out before they leave the ledger, not snap away
  const [leaving, setLeaving] = useState<Record<string, boolean>>({})
  const canReview = role === 'audit'
  const fileRef = useRef<HTMLInputElement>(null)
  const closedYears = useMemo(() => new Set(state.closes.map((c) => c.year)), [state.closes])
  const isClosed = (y: number) => closedYears.has(y)
  const review = (id: string, status: 'approved' | 'rejected') => {
    if (leaving[id] || !canReview) return
    const m = state.metrics.find((x) => x.id === id)
    if (m && closedYears.has(m.year)) return // closed FY — adjustments must be new events
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
    if (isClosed(year)) return
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

  const closePeriod = () => {
    if (role !== 'cfo' || isClosed(year)) return
    dispatch({ type: 'closePeriod', year })
    toast(`FY${year} closed — the period is locked to new events`)
  }

  // ── CSV: file-API only, no libraries ──
  const downloadCsv = (filename: string, text: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
  // quote only when a cell would otherwise break the row (export side)
  const csvCell = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const downloadTemplate = () =>
    downloadCsv(
      'metrics-template.csv',
      ['division,datapoint,year,value', 'refining,E-01-01-01,2026,1850000', 'materials,E-01-03-02,2026,7.5'].join('\n') + '\n',
    )

  // simple line-split parse — no quoted fields. Each row must name a real
  // division id and taxonomy code, an open FY in 2024–2026, and a non-negative
  // value; everything else is skipped and tallied.
  const importCsv = (text: string) => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0)
    let imported = 0
    let skipped = 0
    for (const line of lines) {
      const cols = line.split(',').map((c) => c.trim())
      if (cols[0]?.toLowerCase() === 'division' && cols[1]?.toLowerCase() === 'datapoint') continue // header
      const [divId, code, yearStr, valStr] = cols
      const div = state.divisions.find((d) => d.id === divId)
      const dp = DP_BY_CODE.get(code)
      const y = Number(yearStr)
      const val = Number(valStr)
      const yearOk = Number.isInteger(y) && y >= 2024 && y <= 2026 && !closedYears.has(y)
      const valOk = (valStr ?? '') !== '' && !Number.isNaN(val) && val >= 0
      if (cols.length < 4 || !div || !dp || !yearOk || !valOk) {
        skipped++
        continue
      }
      dispatch({
        type: 'submitMetric',
        rec: { division: div.id, datapoint: dp.code, name: dp.name, year: y, value: val, unit: dp.unit ?? '', by: div.head },
      })
      imported++
    }
    toast(`Imported ${imported} submissions · skipped ${skipped} rows`)
  }

  const onImportFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = '' // let the same file be re-selected later
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => importCsv(String(reader.result ?? ''))
    reader.readAsText(f)
  }

  const exportApproved = () => {
    const approved = state.metrics.filter((m) => m.status === 'approved')
    const header = 'division,datapoint,name,year,value,unit,by'
    const rows = approved.map((m) =>
      [m.division, m.datapoint, csvCell(m.name), m.year, m.value, csvCell(m.unit), csvCell(m.by)].join(','),
    )
    downloadCsv('metrics-approved.csv', [header, ...rows].join('\n') + '\n')
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

      <div className="me-closehead">
        <button
          className="me-btn"
          disabled={role !== 'cfo' || isClosed(year)}
          title={
            role !== 'cfo'
              ? 'Switch to the CFO role to close the period'
              : isClosed(year)
                ? `FY${year} is already closed`
                : `Lock FY${year}: freeze its approved metrics and trades on book`
          }
          onClick={closePeriod}
        >
          Close FY{year}
        </button>
        {[...state.closes]
          .sort((a, b) => a.year - b.year)
          .map((c) => (
            <span
              key={c.year}
              className="me-lock"
              title={`Locked ${new Date(c.closedAt).toLocaleString()} · ${c.approved} approved, ${c.tradeCount} trades on book`}
            >
              FY{c.year} closed · {new Date(c.closedAt).toLocaleDateString()}
            </span>
          ))}
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
            disabled={!canSubmit || role !== 'division' || isClosed(year)}
            title={
              isClosed(year)
                ? `FY${year} is closed`
                : role !== 'division'
                  ? 'Switch to the Division head role to submit'
                  : !canSubmit
                    ? !numeric
                      ? 'Enter a non-negative number'
                      : 'Attach evidence to submit'
                    : undefined
            }
            onClick={submit}
          >
            Submit for review
          </button>
          <p className="me-note">
            Submitted as {div.head} ({div.name}). Approved values feed the
            division's exposure parameters and the firm's disclosure intensity.
          </p>
          <div className="me-csvrow">
            <button
              className="me-btn ghost sm"
              disabled={role !== 'division'}
              title={
                role !== 'division'
                  ? 'Switch to the Division head role to import'
                  : 'Bulk submit from a CSV (division,datapoint,year,value) — simple CSV, no quoted fields'
              }
              onClick={() => fileRef.current?.click()}
            >
              Import CSV
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onImportFile} />
            <button type="button" className="me-link" onClick={downloadTemplate}>
              Download template
            </button>
          </div>
        </div>

        {/* ── approval queue + heartbeat ── */}
        <div className="me-panel" data-tour="me-queue">
          <h3>
            Approval queue <span className="me-count">{pending.length}</span>
          </h3>
          {pending.length === 0 ? (
            <p className="me-empty">Queue is clear.</p>
          ) : (
            pending.map((m) => {
              const qClosed = isClosed(m.year)
              return (
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
                    <button
                      className="me-btn sm"
                      disabled={!canReview || qClosed}
                      title={qClosed ? 'FY closed — adjustments must be new events' : !canReview ? 'Switch to the Audit role to approve' : undefined}
                      onClick={() => review(m.id, 'approved')}
                    >
                      Approve
                    </button>
                    <button
                      className="me-btn sm ghost"
                      disabled={!canReview || qClosed}
                      title={qClosed ? 'FY closed — adjustments must be new events' : !canReview ? 'Switch to the Audit role to reject' : undefined}
                      onClick={() => review(m.id, 'rejected')}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
              )
            })
          )}
          <h3 className="me-h3gap">Recent activity</h3>
          <Activity limit={5} />
        </div>

        {/* ── division ledger: compact list, fits its column ── */}
        <div className="me-panel">
          <div className="me-panelhead">
            <h3>{div.name} submission ledger</h3>
            <button
              className="me-btn ghost sm"
              title="Download every approved metric (all divisions) as CSV"
              onClick={exportApproved}
            >
              Export CSV
            </button>
          </div>
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
