// Live market snapshot — committed by the scheduled FRED workflow, so every
// deploy carries the latest close. Engines read their defaults from here
// instead of hard-coded paper values; the paper calibration (vols, jumps,
// correlations) stays frozen and only the observable state moves.
import snapshot from '../data/market_snapshot.json'

export const MARKET = snapshot as {
  wti: { value: number; date: string }
  usdkrw: { value: number; date: string }
  fetchedAt: string
  source: string
}

export const marketDate = new Date(MARKET.wti.date + 'T00:00:00Z').toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
