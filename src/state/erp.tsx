import { createContext, useContext, useEffect, useReducer, useState, type ReactNode } from 'react'
import type { ModelParams } from '../engine/model'

// Acting role — who is at the desk right now. Persisted separately from the
// demo ledgers so "Reset demo data" restores the seeded history without
// changing which role the visitor is impersonating. Every write action is
// gated on this: division heads submit, audit approves, treasury books, the
// CFO designates — the org chart, made clickable.
export type Role = 'division' | 'treasury' | 'audit' | 'cfo'
export const ROLE_LABEL: Record<Role, string> = {
  division: 'Division head',
  treasury: 'Treasury desk',
  audit: 'Audit',
  cfo: 'CFO',
}
export const ROLES: Role[] = ['division', 'treasury', 'audit', 'cfo']

// The ERP data layer: divisions, a metric-submission ledger, a trade blotter,
// and an append-only audit trail. Client-side only, persisted to localStorage,
// seeded with realistic synthetic history so the system feels lived-in on
// first load. Every state change appends an audit event — the ERP heartbeat.

export type MetricStatus = 'pending' | 'approved' | 'rejected'
export type Designation = 'CFH-A' | 'CFH-B' | 'FVTPL'

export interface Division {
  id: string
  name: string
  head: string
  params: ModelParams
}

export interface MetricRecord {
  id: string
  division: string
  datapoint: string
  name: string
  year: number
  value: number
  unit: string
  by: string
  ts: number
  status: MetricStatus
}

export interface Trade {
  id: string
  division: string
  instrument:
    | 'Zero-cost collar'
    | 'Double-KO quanto'
    | 'European quanto'
    | 'Swap / forward'
    | 'Cap (bought call)'
    | 'Three-way collar'
    | 'Seagull'
  terms: string
  notional: string
  by: string
  ts: number
  designation: Designation
}

export interface ErpEvent {
  id: string
  ts: number
  actor: string
  action: string
  detail: string
}

// A fiscal-year close: the data model is annual (FY), so the "period close" is
// a year close. Snapshots the counts the CFO signs off on. Once a year is in
// here it is locked — no new submissions, no approve/reject on its queue items;
// corrections must be booked as fresh events, never edits to closed history.
export interface Close {
  year: number
  closedAt: number
  approved: number
  rejected: number
  tradeCount: number
}

interface ErpState {
  divisions: Division[]
  metrics: MetricRecord[]
  trades: Trade[]
  events: ErpEvent[]
  closes: Close[]
}

const H = 3600_000
const D = 24 * H
const now = Date.now()
let seq = 0
const nid = (p: string) => `${p}-${(++seq).toString(36)}${Math.random().toString(36).slice(2, 5)}`

const DIVISIONS: Division[] = [
  { id: 'refining', name: 'Refining', head: 'K. Lee', params: { sigmaF: 1.3, sigmaC: 0.8, rho: 0.45, pF: 3.5, pC: 2.1, a: 0.3, phi: 0.5, lambda: 8, k: 0.9, dFloor: 0 } },
  { id: 'chemicals', name: 'Chemicals', head: 'S. Choi', params: { sigmaF: 1.0, sigmaC: 0.6, rho: 0.3, pF: 3.0, pC: 1.8, a: 0.4, phi: 0.5, lambda: 5, k: 0.6, dFloor: 0 } },
  { id: 'materials', name: 'Materials', head: 'M. Han', params: { sigmaF: 0.7, sigmaC: 0.4, rho: 0.15, pF: 1.6, pC: 0.9, a: 0.8, phi: 0.4, lambda: 3, k: 0.5, dFloor: 0 } },
]

function seed(): ErpState {
  const metrics: MetricRecord[] = [
    { division: 'refining', datapoint: 'E-01-01-01', name: 'Scope 1 gross emissions', year: 2025, value: 1_842_000, unit: 'tCO₂eq', by: 'K. Lee', ts: now - 18 * D, status: 'approved' as const },
    { division: 'refining', datapoint: 'E-01-01-04', name: 'Scope 3 gross emissions', year: 2025, value: 12_400_000, unit: 'tCO₂eq', by: 'K. Lee', ts: now - 17 * D, status: 'approved' as const },
    { division: 'refining', datapoint: 'E-01-03-02', name: 'Renewable energy share', year: 2025, value: 6.8, unit: '%', by: 'K. Lee', ts: now - 12 * D, status: 'approved' as const },
    { division: 'chemicals', datapoint: 'E-01-01-01', name: 'Scope 1 gross emissions', year: 2025, value: 610_000, unit: 'tCO₂eq', by: 'S. Choi', ts: now - 15 * D, status: 'approved' as const },
    { division: 'chemicals', datapoint: 'E-02-02-02', name: 'Recycling rate', year: 2025, value: 44.2, unit: '%', by: 'S. Choi', ts: now - 9 * D, status: 'approved' as const },
    { division: 'chemicals', datapoint: 'S-01-02-01', name: 'LTIFR', year: 2025, value: 0.42, unit: 'per 1M hrs', by: 'S. Choi', ts: now - 5 * D, status: 'rejected' as const },
    { division: 'materials', datapoint: 'E-01-01-01', name: 'Scope 1 gross emissions', year: 2025, value: 228_000, unit: 'tCO₂eq', by: 'M. Han', ts: now - 8 * D, status: 'approved' as const },
    { division: 'materials', datapoint: 'G-02-02-03', name: 'Market-risk hedge ratio disclosed', year: 2025, value: 1, unit: 'yes', by: 'M. Han', ts: now - 3 * D, status: 'pending' as const },
    { division: 'refining', datapoint: 'E-01-02-03', name: 'Internal carbon price', year: 2026, value: 42_000, unit: '₩/tCO₂eq', by: 'K. Lee', ts: now - 2 * D, status: 'pending' as const },
    { division: 'chemicals', datapoint: 'E-01-03-01', name: 'Total energy consumption', year: 2025, value: 18_450, unit: 'TJ', by: 'S. Choi', ts: now - 26 * H, status: 'pending' as const },
  ].map((m) => ({ ...m, id: nid('MR') }))

  const tradeSeed: Array<Omit<Trade, 'id'>> = [
    { division: 'refining', instrument: 'Zero-cost collar' as const, terms: 'cap $95 / floor $77.35 · 0.50y', notional: '1.20M bbl', by: 'Treasury desk', ts: now - 11 * D, designation: 'CFH-B' as const },
    { division: 'refining', instrument: 'Double-KO quanto' as const, terms: 'K $78.94 · KO 50/120 · 0.83y', notional: '0.60M bbl', by: 'Treasury desk', ts: now - 10 * D, designation: 'CFH-A' as const },
    { division: 'chemicals', instrument: 'Zero-cost collar' as const, terms: 'cap $92 / floor $79.10 · 0.50y', notional: '0.45M bbl', by: 'Treasury desk', ts: now - 6 * D, designation: 'CFH-B' as const },
  ]
  const trades: Trade[] = tradeSeed.map((t) => ({ ...t, id: nid('TR') }))

  const events: ErpEvent[] = [
    { ts: now - 18 * D, actor: 'K. Lee', action: 'submitted', detail: 'Refining · Scope 1 emissions FY2025' },
    { ts: now - 17 * D + 2 * H, actor: 'J. Kim (audit)', action: 'approved', detail: 'Refining · Scope 1 emissions FY2025' },
    { ts: now - 11 * D, actor: 'Treasury desk', action: 'booked', detail: 'Refining · zero-cost collar · 1.20M bbl' },
    { ts: now - 10 * D, actor: 'Treasury desk', action: 'booked', detail: 'Refining · double-KO quanto · 0.60M bbl' },
    { ts: now - 10 * D + H, actor: 'CFO office', action: 'designated', detail: 'quanto → CFH-A (combined)' },
    { ts: now - 6 * D, actor: 'Treasury desk', action: 'booked', detail: 'Chemicals · zero-cost collar · 0.45M bbl' },
    { ts: now - 5 * D, actor: 'J. Kim (audit)', action: 'rejected', detail: 'Chemicals · LTIFR FY2025 — contractor hours missing' },
    { ts: now - 3 * D, actor: 'M. Han', action: 'submitted', detail: 'Materials · hedge-ratio disclosure flag' },
    { ts: now - 2 * D, actor: 'K. Lee', action: 'submitted', detail: 'Refining · internal carbon price FY2026' },
    { ts: now - 26 * H, actor: 'S. Choi', action: 'submitted', detail: 'Chemicals · energy consumption FY2025' },
  ].map((e) => ({ ...e, id: nid('EV') }))

  return { divisions: DIVISIONS, metrics, trades, events, closes: [] }
}

type Action =
  | { type: 'submitMetric'; rec: Omit<MetricRecord, 'id' | 'ts' | 'status'> }
  | { type: 'reviewMetric'; id: string; status: 'approved' | 'rejected'; actor: string }
  | { type: 'bookTrade'; trade: Omit<Trade, 'id' | 'ts'> }
  | { type: 'designate'; id: string; designation: Designation }
  | { type: 'setDivisionParams'; id: string; params: ModelParams }
  | { type: 'closePeriod'; year: number }
  | { type: 'reset' }

function log(s: ErpState, actor: string, action: string, detail: string): ErpEvent[] {
  return [{ id: nid('EV'), ts: Date.now(), actor, action, detail }, ...s.events].slice(0, 80)
}

// Ledgers are capped so a demo visitor mashing Book/Submit can't grow
// localStorage without bound — oldest records fall off, audit trail included.
const MAX_TRADES = 40
const MAX_METRICS = 60

function reducer(s: ErpState, a: Action): ErpState {
  switch (a.type) {
    case 'submitMetric': {
      // identical pending submission → no-op instead of a duplicate queue entry
      if (
        s.metrics.some(
          (m) =>
            m.status === 'pending' &&
            m.division === a.rec.division &&
            m.datapoint === a.rec.datapoint &&
            m.year === a.rec.year &&
            m.value === a.rec.value,
        )
      )
        return s
      const rec: MetricRecord = { ...a.rec, id: nid('MR'), ts: Date.now(), status: 'pending' as const }
      return {
        ...s,
        metrics: [rec, ...s.metrics].slice(0, MAX_METRICS),
        events: log(s, rec.by, 'submitted', `${divName(s, rec.division)} · ${rec.name} FY${rec.year}`),
      }
    }
    case 'reviewMetric': {
      const m = s.metrics.find((x) => x.id === a.id)
      if (!m) return s
      return {
        ...s,
        metrics: s.metrics.map((x) => (x.id === a.id ? { ...x, status: a.status } : x)),
        events: log(s, a.actor, a.status, `${divName(s, m.division)} · ${m.name} FY${m.year}`),
      }
    }
    case 'bookTrade': {
      const now = Date.now()
      // rapid-fire duplicate (same structure, same division, within 5s) → no-op
      if (
        s.trades.some(
          (t) =>
            now - t.ts < 5000 &&
            t.division === a.trade.division &&
            t.instrument === a.trade.instrument &&
            t.terms === a.trade.terms &&
            t.notional === a.trade.notional,
        )
      )
        return s
      const t: Trade = { ...a.trade, id: nid('TR'), ts: now }
      return {
        ...s,
        trades: [t, ...s.trades].slice(0, MAX_TRADES),
        events: log(s, t.by, 'booked', `${divName(s, t.division)} · ${t.instrument.toLowerCase()} · ${t.notional}`),
      }
    }
    case 'designate': {
      const t = s.trades.find((x) => x.id === a.id)
      if (!t) return s
      return {
        ...s,
        trades: s.trades.map((x) => (x.id === a.id ? { ...x, designation: a.designation } : x)),
        events: log(s, 'CFO office', 'designated', `${t.instrument.toLowerCase()} (${divName(s, t.division)}) → ${a.designation}`),
      }
    }
    case 'setDivisionParams':
      return { ...s, divisions: s.divisions.map((d) => (d.id === a.id ? { ...d, params: a.params } : d)) }
    case 'closePeriod': {
      // re-close is a no-op — a fiscal year locks exactly once
      if (s.closes.some((c) => c.year === a.year)) return s
      const yearMetrics = s.metrics.filter((m) => m.year === a.year)
      const approved = yearMetrics.filter((m) => m.status === 'approved').length
      const rejected = yearMetrics.filter((m) => m.status === 'rejected').length
      const tradeCount = s.trades.length
      const close: Close = { year: a.year, closedAt: Date.now(), approved, rejected, tradeCount }
      return {
        ...s,
        closes: [...s.closes, close],
        events: log(s, 'CFO office', 'closed', `FY${a.year} closed — ${approved} approved metrics, ${tradeCount} trades on book`),
      }
    }
    case 'reset':
      return seed()
  }
}

function divName(s: ErpState, id: string): string {
  return s.divisions.find((d) => d.id === id)?.name ?? id
}

const KEY = 'hongerp-v1'
const ROLE_KEY = 'hongerp-role'

function initRole(): Role {
  try {
    const r = localStorage.getItem(ROLE_KEY)
    if (r && (ROLES as string[]).includes(r)) return r as Role
  } catch {
    /* fall through to default */
  }
  return 'treasury'
}

function init(): ErpState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // closes defaults in for ledgers persisted before the period-close feature
      if (parsed && parsed.divisions?.length === 3) return { closes: [], ...parsed }
    }
  } catch {
    /* fall through to seed */
  }
  return seed()
}

const ErpContext = createContext<{
  state: ErpState
  dispatch: (a: Action) => void
  role: Role
  setRole: (r: Role) => void
} | null>(null)

export function ErpProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, init)
  const [role, setRole] = useState<Role>(initRole)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* storage may be unavailable; demo still works in-memory */
    }
  }, [state])
  // role lives under its own key so resetting the demo ledgers leaves it alone
  useEffect(() => {
    try {
      localStorage.setItem(ROLE_KEY, role)
    } catch {
      /* storage may be unavailable; demo still works in-memory */
    }
  }, [role])
  return <ErpContext.Provider value={{ state, dispatch, role, setRole }}>{children}</ErpContext.Provider>
}

export function useErp() {
  const ctx = useContext(ErpContext)
  if (!ctx) throw new Error('useErp outside ErpProvider')
  return ctx
}

export function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000))
  if (s < 90) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 90) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 36) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
