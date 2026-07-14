import { timeAgo, useErp } from '../state/erp'
import './Activity.css'

const ICONS: Record<string, string> = {
  submitted: '↑',
  approved: '✓',
  rejected: '✕',
  booked: '⇄',
  designated: '§',
}

export default function Activity({ limit = 6, division }: { limit?: number; division?: string }) {
  const { state } = useErp()
  const rows = state.events
    .filter((e) => !division || e.detail.toLowerCase().includes(division.toLowerCase()))
    .slice(0, limit)
  return (
    <ul className="act">
      {rows.map((e) => (
        <li key={e.id}>
          <span className={`act-ic act-${e.action}`}>{ICONS[e.action] ?? '·'}</span>
          <span className="act-body">
            <strong>{e.actor}</strong> {e.action} — {e.detail}
          </span>
          <span className="act-time">{timeAgo(e.ts)}</span>
        </li>
      ))}
    </ul>
  )
}
