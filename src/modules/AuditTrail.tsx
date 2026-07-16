import { useMemo, useState } from 'react'
import { timeAgo, useErp } from '../state/erp'
import './AuditTrail.css'

// Append-only event ledger, surfaced as its own screen. Every write across the
// ERP — submit, approval/rejection, booking, designation — lands in
// state.events (newest first, capped). This module is read-only: it filters and
// renders that ledger. No role gating; anyone at the desk can audit the trail.

// canonical verb order so the chip row reads in workflow sequence, not the
// arbitrary order verbs first appear in the event stream
const VERB_ORDER = ['submitted', 'approved', 'rejected', 'booked', 'designated']

function verbClass(action: string): string {
  return VERB_ORDER.includes(action) ? `at-verb-${action}` : 'at-verb-other'
}

export default function AuditTrail() {
  const { state } = useErp()
  const [verb, setVerb] = useState<string>('all')
  const [division, setDivision] = useState<string>('all')

  // verbs actually present in the ledger, in canonical order (unknown verbs
  // appended after), so the filter row never offers a chip that matches nothing
  const verbs = useMemo(() => {
    const present = new Set(state.events.map((e) => e.action))
    const known = VERB_ORDER.filter((v) => present.has(v))
    const extra = [...present].filter((v) => !VERB_ORDER.includes(v)).sort()
    return [...known, ...extra]
  }, [state.events])

  // division is not structured on events — match on the division name appearing
  // in the free-text detail, same convention the Activity feed uses
  const rows = useMemo(() => {
    const div = division === 'all' ? null : division.toLowerCase()
    return state.events.filter(
      (e) =>
        (verb === 'all' || e.action === verb) &&
        (!div || e.detail.toLowerCase().includes(div)),
    )
  }, [state.events, verb, division])

  return (
    <div className="at">
      <div className="at-bar">
        <div className="at-count-wrap">
          <span className="at-count">{rows.length}</span>
          <span className="at-count-label">
            {rows.length === 1 ? 'event' : 'events'}
            {(verb !== 'all' || division !== 'all') && ` of ${state.events.length}`}
          </span>
        </div>
        <div className="at-filters">
          <div className="at-chiprow" role="group" aria-label="Filter by action">
            <button
              className={verb === 'all' ? 'at-chip active' : 'at-chip'}
              onClick={() => setVerb('all')}
            >
              All
            </button>
            {verbs.map((v) => (
              <button
                key={v}
                className={verb === v ? 'at-chip active' : 'at-chip'}
                onClick={() => setVerb(v)}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="at-chiprow" role="group" aria-label="Filter by division">
            <button
              className={division === 'all' ? 'at-chip active' : 'at-chip'}
              onClick={() => setDivision('all')}
            >
              All
            </button>
            {state.divisions.map((d) => (
              <button
                key={d.id}
                className={division === d.name ? 'at-chip active' : 'at-chip'}
                onClick={() => setDivision(d.name)}
              >
                {d.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="at-table-wrap">
        <table className="at-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td className="at-when" title={new Date(e.ts).toLocaleString()}>
                  {timeAgo(e.ts)}
                </td>
                <td className="at-actor">{e.actor}</td>
                <td>
                  <span className={`at-verb ${verbClass(e.action)}`}>{e.action}</span>
                </td>
                <td className="at-detail">{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="at-empty">No events match.</p>}
      </div>
    </div>
  )
}
