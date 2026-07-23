// FROZEN ENGINE — Park, "ESG Disclosure Mandates and Corporate Hedging" §3
// (revision 2026-07-23). Equations transcribed verbatim:
//
//   Σ = [[σf², ρσfσc], [ρσfσc, σc²]],  u ≡ 1 − h,  R = uᵀΣu
//   Λ(d) = φ + λe^(−kd)                          (eq. Λ)
//   2Λ(d)·Σ·u = p        ⇒  u* = Σ⁻¹p / 2Λ(d*)   (eq. usol)
//   κ = pᵀΣ⁻¹p,  R* = κ / 4Λ²                    (eq. Rstar)
//   voluntary d*: 8a·d·Λ(d)² = kλκ·e^(−kd)       (eq. dfixed; interior root unique
//                                                  under the maintained forms, λ>0)
//   mandate floor: d** = max(d̲, d*_v)            (eq. floor, KKT)
//   hedge ratios are clamped to [0,1] (corner solutions, §3 corner subsection)
//
// Uniqueness here is a property of the assumed quadratic-cost /
// exponential-attenuation specification, not a general feature of joint
// disclosure-hedging problems (paper, Appendix on second-order conditions).
// These are comparative statics of a structural model: they follow from the
// functional forms above, and are not estimates. The paper's executed test on
// Korea's two realized mandates returns tightly bounded nulls; the fiscal-2027
// climate mandate is the informative forward test.
//
// Any change to these formulas must come from a new frozen paper revision.

export const ENGINE_VERSION = 'frozen-1.1 · paper §3 (2026-07-23)'

export interface ModelParams {
  sigmaF: number // σf: financial exposure volatility
  sigmaC: number // σc: climate exposure volatility
  rho: number // ρ: correlation, |ρ| < 1
  pF: number // p_f: financial hedge premium (per unit)
  pC: number // p_c: climate hedge premium (per unit)
  a: number // disclosure cost coefficient (C_D = a d²)
  phi: number // φ: baseline distress-cost price of residual risk
  lambda: number // λ: regulatory stringency
  k: number // penalty attenuation / verification hazard
  dFloor: number // d̲: mandated disclosure floor (0 = purely voluntary)
}

export interface Equilibrium {
  dVoluntary: number // interior root of eq. dfixed
  dStar: number // max(d̲, dVoluntary)
  floorBinding: boolean
  lambdaAtD: number // Λ(d*)
  hF: number // h_f* clamped to [0,1]
  hC: number // h_c* clamped to [0,1]
  hFInterior: number // unclamped, for corner diagnostics
  hCInterior: number
  residualRisk: number // R at the (clamped) equilibrium
  kappa: number // pᵀΣ⁻¹p
  costs: { hedge: number; disclosure: number; residual: number; total: number }
}

export function lambdaOf(d: number, p: Pick<ModelParams, 'phi' | 'lambda' | 'k'>): number {
  return p.phi + p.lambda * Math.exp(-p.k * d)
}

function sigmaInvP(p: ModelParams): [number, number] {
  // Σ⁻¹p, closed form (eq. usol right-hand block)
  const det = p.sigmaF ** 2 * p.sigmaC ** 2 * (1 - p.rho ** 2)
  const x = (p.sigmaC ** 2 * p.pF - p.rho * p.sigmaF * p.sigmaC * p.pC) / det
  const y = (p.sigmaF ** 2 * p.pC - p.rho * p.sigmaF * p.sigmaC * p.pF) / det
  return [x, y]
}

export function kappaOf(p: ModelParams): number {
  const [x, y] = sigmaInvP(p)
  return p.pF * x + p.pC * y
}

export function residualR(hF: number, hC: number, p: ModelParams): number {
  const u = 1 - hF
  const v = 1 - hC
  return u * u * p.sigmaF ** 2 + v * v * p.sigmaC ** 2 + 2 * p.rho * p.sigmaF * p.sigmaC * u * v
}

// Hedge ratios given d — KKT solution of the box-constrained convex QP
// min_{h∈[0,1]²} pᵀh + Λ(d)·uᵀΣu (paper's corner subsection: clamp a leg, then
// re-optimize the other). Σ is positive definite, so projected coordinate
// descent converges; interior draws reproduce eq. usol to numerical tolerance.
export function hedgeAt(d: number, p: ModelParams): { hF: number; hC: number; hFInterior: number; hCInterior: number } {
  const lam = lambdaOf(d, p)
  const [x, y] = sigmaInvP(p)
  const hFInterior = 1 - x / (2 * lam)
  const hCInterior = 1 - y / (2 * lam)
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  // start from clamped interior; per-coordinate minimizers, projected
  let u = clamp(1 - hFInterior) // unhedged fractions u, v ∈ [0,1]
  let v = clamp(1 - hCInterior)
  for (let i = 0; i < 100; i++) {
    const uNew = clamp((p.pF / (2 * lam) - p.rho * p.sigmaF * p.sigmaC * v) / p.sigmaF ** 2)
    const vNew = clamp((p.pC / (2 * lam) - p.rho * p.sigmaF * p.sigmaC * uNew) / p.sigmaC ** 2)
    if (Math.abs(uNew - u) + Math.abs(vNew - v) < 1e-14) {
      u = uNew
      v = vNew
      break
    }
    u = uNew
    v = vNew
  }
  return { hF: 1 - u, hC: 1 - v, hFInterior, hCInterior }
}

// Reduced objective F(d) = pᵀh(d) + a·d² + Λ(d)·R(h(d)) with h(d) the KKT
// hedge above. In the interior regime its stationary point is the
// fixed point 8adΛ² = kλκe^(−kd) (eq. dfixed); at corners the KKT hedge keeps
// F continuous and the minimizer well-defined. Solved by scan + ternary refine.
function reducedCost(d: number, p: ModelParams): number {
  const h = hedgeAt(d, p)
  return objective(h.hF, h.hC, d, p)
}

export function solveVoluntaryD(p: ModelParams): number {
  if (p.lambda <= 0) return 0
  // scale the search window from the interior fixed point when it exists
  const kappa = kappaOf(p)
  let scale = 1
  if (kappa > 0) {
    const g = (d: number) =>
      p.k * p.lambda * kappa * Math.exp(-p.k * d) - 8 * p.a * d * lambdaOf(d, p) ** 2
    if (g(0) > 0) {
      let hi = 1
      while (g(hi) > 0 && hi < 1e6) hi *= 2
      scale = hi
    }
  }
  const hi = Math.max(4 * scale, 5)
  // coarse scan
  const N = 600
  let bestD = 0
  let bestV = reducedCost(0, p)
  for (let i = 1; i <= N; i++) {
    const d = (i / N) * hi
    const val = reducedCost(d, p)
    if (val < bestV) {
      bestV = val
      bestD = d
    }
  }
  // ternary refine around the coarse minimum
  let lo = Math.max(0, bestD - hi / N)
  let up = bestD + hi / N
  for (let i = 0; i < 100; i++) {
    const m1 = lo + (up - lo) / 3
    const m2 = up - (up - lo) / 3
    if (reducedCost(m1, p) < reducedCost(m2, p)) up = m2
    else lo = m1
  }
  return (lo + up) / 2
}

export function solveEquilibrium(p: ModelParams): Equilibrium {
  const dVoluntary = solveVoluntaryD(p)
  const dStar = Math.max(p.dFloor, dVoluntary)
  const floorBinding = p.dFloor > dVoluntary
  const lam = lambdaOf(dStar, p)
  const h = hedgeAt(dStar, p)
  const R = residualR(h.hF, h.hC, p)
  const hedge = p.pF * h.hF + p.pC * h.hC
  const disclosure = p.a * dStar * dStar
  const residual = lam * R
  return {
    dVoluntary,
    dStar,
    floorBinding,
    lambdaAtD: lam,
    ...h,
    residualRisk: R,
    kappa: kappaOf(p),
    costs: { hedge, disclosure, residual, total: hedge + disclosure + residual },
  }
}

// Total objective Π — exported so an independent numerical minimizer can
// cross-check the closed form, as the paper checks its solver against one.
export function objective(hF: number, hC: number, d: number, p: ModelParams): number {
  return p.pF * hF + p.pC * hC + p.a * d * d + lambdaOf(d, p) * residualR(hF, hC, p)
}
