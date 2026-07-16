// Walk-forward hedge backtest — the TypeScript port of
// modeling/python/07_backtest/backtest.py, so the ERP can re-run the whole
// thing live as the user drags the window / budget / transaction-cost sliders.
// Identical logic: strict rolling-window MV coverage split, applied out of
// sample, transaction costs on turnover. Verified to match the Python defaults
// (window 60, budget 1.0, tc 5bp -> walk-forward variance reduction 89.1%).

export interface Ret { m: string; o: number; f: number }
export interface Params { window: number; budget: number; tcBps: number }

export interface PolicyResult {
  policy: string
  annVol: number
  cvar95: number
  mdd: number
  totalCost: number
  varReduction: number
  n: number
}
export interface BacktestOut {
  summary: PolicyResult[]
  paths: Record<string, { month: string; cum: number }[]>
  rolling: { month: string; w1: number; w2: number; rho: number }[]
  oracleSplit: { w1: number; w2: number }
  negShare: number
  span: [string, string]
}

const ANN = Math.sqrt(12)
const POLICIES = ['unhedged', 'naive', 'oracle', 'walkforward'] as const

// covariance of a (n x 2) window, sample (ddof=1)
function cov2(rows: Ret[]): [number, number, number] {
  const n = rows.length
  let mo = 0, mf = 0
  for (const r of rows) { mo += r.o; mf += r.f }
  mo /= n; mf /= n
  let so = 0, sf = 0, sof = 0
  for (const r of rows) {
    const a = r.o - mo, b = r.f - mf
    so += a * a; sf += b * b; sof += a * b
  }
  return [so / (n - 1), sf / (n - 1), sof / (n - 1)] // [Var oil, Var fx, Cov]
}

// budget-constrained minimum-variance coverage split: minimize
// Var((1-h1)r_o + (1-h2)r_f) s.t. h1+h2 = budget, 0<=h1,h2<=1 (line search on edge)
export function mvSplit(s1: number, s2: number, s12: number, budget: number): [number, number] {
  const lo = Math.max(0, budget - 1), hi = Math.min(1, budget)
  let best = Infinity, bh: [number, number] = [0, 0]
  for (let k = 0; k <= 2000; k++) {
    const h1 = lo + ((hi - lo) * k) / 2000
    const h2 = budget - h1
    const u1 = 1 - h1, u2 = 1 - h2
    const v = u1 * u1 * s1 + u2 * u2 * s2 + 2 * u1 * u2 * s12
    if (v < best) { best = v; bh = [h1, h2] }
  }
  return bh
}

function cvar95(x: number[]): number {
  const s = [...x].sort((a, b) => a - b)
  const k = Math.max(1, Math.floor(0.05 * s.length))
  let sum = 0
  for (let i = 0; i < k; i++) sum += s[i]
  return -(sum / k)
}
function maxDrawdown(x: number[]): number {
  let cum = 0, peak = 0, mdd = 0
  for (const v of x) { cum += v; peak = Math.max(peak, cum); mdd = Math.max(mdd, peak - cum) }
  return mdd
}
function std(x: number[]): number {
  const n = x.length
  const m = x.reduce((a, b) => a + b, 0) / n
  let s = 0
  for (const v of x) s += (v - m) * (v - m)
  return Math.sqrt(s / (n - 1))
}

export function runBacktest(returns: Ret[], p: Params): BacktestOut {
  const R = returns
  const T = R.length
  const W = Math.min(Math.max(p.window, 12), T - 12)
  // full-sample oracle split (deliberately look-ahead)
  const [S1, S2, S12] = cov2(R)
  const oracleSplit = mvSplit(S1, S2, S12, p.budget)

  const resid: Record<string, number[]> = { unhedged: [], naive: [], oracle: [], walkforward: [] }
  const cost: Record<string, number> = { unhedged: 0, naive: 0, oracle: 0, walkforward: 0 }
  const hprev: Record<string, [number, number]> = { unhedged: [0, 0], naive: [0, 0], oracle: [0, 0], walkforward: [0, 0] }
  const rolling: BacktestOut['rolling'] = []
  const months: string[] = []

  for (let t = W; t < T; t++) {
    const [s1, s2, s12] = cov2(R.slice(t - W, t))
    const rho = s12 / Math.sqrt(s1 * s2)
    const hset: Record<string, [number, number]> = {
      unhedged: [0, 0],
      naive: [p.budget / 2, p.budget / 2],
      oracle: oracleSplit,
      walkforward: mvSplit(s1, s2, s12, p.budget),
    }
    const ro = R[t].o, rf = R[t].f
    for (const name of POLICIES) {
      const [h1, h2] = hset[name]
      const u = (1 - h1) * ro + (1 - h2) * rf
      const turnover = Math.abs(h1 - hprev[name][0]) + Math.abs(h2 - hprev[name][1])
      const c = (turnover * p.tcBps) / 1e4
      resid[name].push(u - c)
      cost[name] += c
      hprev[name] = [h1, h2]
    }
    months.push(R[t].m)
    rolling.push({ month: R[t].m, w1: hset.walkforward[0], w2: hset.walkforward[1], rho })
  }

  const baseVol = std(resid.unhedged) * ANN
  const summary: PolicyResult[] = POLICIES.map((name) => {
    const x = resid[name]
    const annVol = std(x) * ANN
    return {
      policy: name,
      annVol,
      cvar95: cvar95(x),
      mdd: maxDrawdown(x),
      totalCost: cost[name],
      varReduction: 1 - (annVol / baseVol) ** 2,
      n: x.length,
    }
  })

  // subsample paths + rolling to <=240 points for the charts
  const sub = <U,>(arr: U[], max = 240): U[] => {
    if (arr.length <= max) return arr
    const out: U[] = []
    for (let i = 0; i < max; i++) out.push(arr[Math.round((i * (arr.length - 1)) / (max - 1))])
    return out
  }
  const paths: BacktestOut['paths'] = {}
  for (const name of POLICIES) {
    let cum = 0
    const full = resid[name].map((v, i) => { cum += v; return { month: months[i], cum } })
    paths[name] = sub(full)
  }
  const negShare = rolling.filter((r) => r.rho < 0).length / rolling.length
  return { summary, paths, rolling: sub(rolling), oracleSplit: { w1: oracleSplit[0], w2: oracleSplit[1] }, negShare, span: [months[0], months[months.length - 1]] }
}
