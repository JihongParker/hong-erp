// Hedge-instrument engine — vanilla layer.
// Black-76 (options on forwards) closed form + zero-cost collar strike solver.
// Convention: an importer is SHORT the commodity price — the hedge is a
// purchased call (cap) financed by a written put (floor).
//   effective cost(S_T) = S_T − max(S_T − Kc, 0) + max(Kp − S_T, 0)
//                       = clamp(S_T, Kp, Kc)
// The double-KO quanto (research instrument) lives in a separate precomputed
// layer — see the Exotic Desk module.

export interface MarketParams {
  F: number // forward price
  sigma: number // implied vol (annualized)
  T: number // maturity in years
  r: number // discount rate (cont. comp.)
}

// standard normal CDF via Abramowitz–Stegun 7.1.26 erf approximation
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x) / Math.SQRT2)
  const erf =
    1 -
    (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp((-x * x) / 2)
  return x >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf)
}

export function black76Call(K: number, m: MarketParams): number {
  const { F, sigma, T, r } = m
  if (T <= 0 || sigma <= 0) return Math.exp(-r * T) * Math.max(F - K, 0)
  const sT = sigma * Math.sqrt(T)
  const d1 = (Math.log(F / K) + 0.5 * sT * sT) / sT
  const d2 = d1 - sT
  return Math.exp(-r * T) * (F * normCdf(d1) - K * normCdf(d2))
}

export function black76Put(K: number, m: MarketParams): number {
  const { F, sigma, T, r } = m
  if (T <= 0 || sigma <= 0) return Math.exp(-r * T) * Math.max(K - F, 0)
  const sT = sigma * Math.sqrt(T)
  const d1 = (Math.log(F / K) + 0.5 * sT * sT) / sT
  const d2 = d1 - sT
  return Math.exp(-r * T) * (K * normCdf(-d2) - F * normCdf(-d1))
}

export interface CollarSolution {
  capK: number
  floorK: number
  callPremium: number
  putPremium: number // equals callPremium at the zero-cost floor
  netPremium: number // residual, ~0 by construction
}

// Given the cap strike Kc (≥ F usually), find the floor Kp < Kc whose written
// put finances the purchased call. Put value is strictly increasing in K,
// so bisection on (εF, Kc) is exact.
export function solveZeroCostFloor(capK: number, m: MarketParams): CollarSolution {
  const target = black76Call(capK, m)
  let lo = 0.01 * m.F
  let hi = capK
  if (black76Put(hi, m) < target) {
    // written put at the cap itself cannot finance the call (deep-ITM cap);
    // return the degenerate corner honestly
    return { capK, floorK: hi, callPremium: target, putPremium: black76Put(hi, m), netPremium: target - black76Put(hi, m) }
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (black76Put(mid, m) < target) lo = mid
    else hi = mid
  }
  const floorK = (lo + hi) / 2
  const putPremium = black76Put(floorK, m)
  return { capK, floorK, callPremium: target, putPremium, netPremium: target - putPremium }
}

// ── zero-cost multi-leg extensions (three-way collar, seagull) ──────────────
// Both cheapen or improve the plain collar by SELLING an extra wing, and both
// reintroduce a tail the collar had removed — the same "sold barrier/wing pays
// for the strikes" mechanism that turns a collar into a KIKO. Solved for exact
// zero cost by bisection on the one free strike; the sold wing's strike is a
// user choice (how far out you push the torn protection).

export interface ThreeWaySolution {
  capK: number // long call (protection cap)
  floorK: number // short put (participation floor) — solved for zero cost
  subFloorK: number // second short put, below the floor (the sold wing)
  netPremium: number
  tearsBelow: number // crash level under which protection inverts (= subFloorK)
}

// Long call Kc, short put Kf, short put Kp2 (< Kf). The extra credit from the
// deep put lets the floor sit HIGHER than a plain collar (less downside given
// up) — but below Kp2 the buyer owes on the second put and effective cost rises
// back above the floor. Given Kc and Kp2, solve Kf so call = put(Kf)+put(Kp2).
export function solveThreeWay(capK: number, subFloorK: number, m: MarketParams): ThreeWaySolution {
  const target = black76Call(capK, m) - black76Put(subFloorK, m)
  // target is the put(Kf) value we must match; if the deep put already over-
  // finances the call, the floor collapses to the sub-floor (degenerate corner)
  if (target <= black76Put(subFloorK, m)) {
    const fk = Math.max(subFloorK, 0.01 * m.F)
    return { capK, floorK: fk, subFloorK, netPremium: black76Call(capK, m) - black76Put(fk, m) - black76Put(subFloorK, m), tearsBelow: subFloorK }
  }
  let lo = subFloorK
  let hi = capK
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (black76Put(mid, m) < target) lo = mid
    else hi = mid
  }
  const floorK = (lo + hi) / 2
  const netPremium = black76Call(capK, m) - black76Put(floorK, m) - black76Put(subFloorK, m)
  return { capK, floorK, subFloorK, netPremium, tearsBelow: subFloorK }
}

export interface SeagullSolution {
  capK: number // long call (protection starts)
  ceilK: number // short call (protection ends — the sold wing)
  floorK: number // short put — solved for zero cost
  netPremium: number
  tearsAbove: number // spike level over which protection inverts (= ceilK)
}

// Long call Kc, short call Kceil (> Kc), short put Kf. The sold far call caps
// the protection: above Kceil the buyer is re-exposed to a price spike. Given
// Kc and Kceil, solve Kf so call(Kc) - call(Kceil) = put(Kf).
export function solveSeagull(capK: number, ceilK: number, m: MarketParams): SeagullSolution {
  const target = black76Call(capK, m) - black76Call(ceilK, m)
  let lo = 0.01 * m.F
  let hi = capK
  if (black76Put(hi, m) < target) {
    return { capK, ceilK, floorK: hi, netPremium: target - black76Put(hi, m), tearsAbove: ceilK }
  }
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2
    if (black76Put(mid, m) < target) lo = mid
    else hi = mid
  }
  const floorK = (lo + hi) / 2
  const netPremium = target - black76Put(floorK, m)
  return { capK, ceilK, floorK, netPremium, tearsAbove: ceilK }
}

// Effective purchase cost per strategy at terminal price s (importer view:
// higher price = higher cost, so protection means capping the upside).
export const effectiveCost = {
  unhedged: (s: number) => s,
  forward: (_s: number, F: number) => F,
  collar: (s: number, floorK: number, capK: number) => Math.min(capK, Math.max(floorK, s)),
  // cap-only (premium paid upfront, added as amortized cost)
  capOnly: (s: number, capK: number, premium: number) => Math.min(s, capK) + premium,
  // three-way: collar that tears open again below the sub-floor
  threeWay: (s: number, floorK: number, capK: number, subFloorK: number) =>
    s - Math.max(s - capK, 0) + Math.max(floorK - s, 0) + Math.max(subFloorK - s, 0),
  // seagull: collar whose upside protection ends at the ceiling (spike re-exposes)
  seagull: (s: number, floorK: number, capK: number, ceilK: number) =>
    s - Math.max(s - capK, 0) + Math.max(s - ceilK, 0) + Math.max(floorK - s, 0),
}
