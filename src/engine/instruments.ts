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

// Effective purchase cost per strategy at terminal price s
export const effectiveCost = {
  unhedged: (s: number) => s,
  forward: (_s: number, F: number) => F,
  collar: (s: number, floorK: number, capK: number) => Math.min(capK, Math.max(floorK, s)),
  // cap-only (premium paid upfront, added as amortized cost)
  capOnly: (s: number, capK: number, premium: number) => Math.min(s, capK) + premium,
}
