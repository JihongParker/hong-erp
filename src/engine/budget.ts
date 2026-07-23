// FROZEN — Park, "Optimal WTI–FX hedge ratios under a fixed budget" (P1).
// Equations transcribed verbatim from §3 (eq. gmvp, costeu, costam, constraints)
// and Table 1 inputs. Anchors: European risk-min optimum (0.970486, 0.029514),
// European: sigma_res 0.09160, budget binds at KRW 45bn -> (0.9705, 0.0295).
// American: (0.9660, 0.0340), budget slack ~KRW 8.9bn -> the simplex w1+w2<=1
// binds, not the cash budget. Both regimes share one unconstrained optimum and
// separate only through the budget.

export type Regime = 'european' | 'american'

// Table 1 — every downstream number comes from these and nothing else
export const P1_INPUTS = {
  S_WTI: 78.94,
  S_KRW: 1540.64,
  Q_oil: 2_000_000,
  Q_USD: 157_880_000,
  r_w: 0.07,
  B: 45_000_000_000,
  T1: 0.833,
  T2: 0.5,
  stressWTI: 113,
  stressKRW: 1550,
  sigma1EU: 0.39455, // sigma_res takes the raw historical volatility in both
  sigma1AM: 0.32419, // regimes; the diffusive figure is a pricing-engine input
  sigma2: 0.09258,
  rho: 0.08763,
  P_B76: 12.6524, // USD/bbl
  P_GK: 84.667, // KRW/USD
  P_Sh_WTI: 15_093.75, // KRW/bbl
  P_Sh_FX: 2_038.72, // KRW/bbl (Shapley share of the per-barrel joint premium — Paper 2 §8.1)
  // §7-8: stress-conditional KO survival analysis
  p_KO_stress: 0.8925, // measured stress KO probability (200k paths)
  p_KO_breakeven: 0.0424, // p̄ above which vanilla dominates KO
} as const

// §7–8 — the survival haircut and the instrument switch. The knock-out
// discount is a loan against the states in which the hedge is needed: worth
// taking only while the probability of the protection being dead when needed
// (p) stays below the paper's break-even p̄ = 4.24%. The per-unit economics
// are linear in the mix, so the optimum is bang-bang: below p̄ the WTI book
// holds the knock-out, above it the optimizer walks the book to all-vanilla.
// KRW anchors from the frozen inputs: full-book stress loss ≈ ₩105.6bn, so
// the discount is worth p̄ × 105.6 ≈ ₩4.5bn — and measured stress mortality
// 89.25% ≈ 21× the break-even (§7).
export interface SurvivalSwitch {
  pBar: number // break-even mortality p̄
  koShare: 0 | 1 // optimal KO fraction of the WTI book at mortality p (bang-bang)
  allVanilla: boolean
  fullBookStressLoss: number // KRW lost on a fully unprotected WTI book in the stress state
  discountValue: number // KRW value of the KO discount = p̄ × fullBookStressLoss
  expectedMortalityCost: number // KRW expected cost of dead protection = p × fullBookStressLoss
  marginRatio: number // p / p̄ — how far past (or under) the switch the book sits
}

export function survivalSwitch(p: number): SurvivalSwitch {
  const I = P1_INPUTS
  const pBar = I.p_KO_breakeven
  const fullBookStressLoss =
    I.Q_oil * Math.max(0, I.stressWTI - I.S_WTI) * I.stressKRW
  const allVanilla = p > pBar
  return {
    pBar,
    koShare: allVanilla ? 0 : 1,
    allVanilla,
    fullBookStressLoss,
    discountValue: pBar * fullBookStressLoss,
    expectedMortalityCost: p * fullBookStressLoss,
    marginRatio: p / pBar,
  }
}

export interface BudgetParams {
  regime: Regime
  B: number
  stressWTI: number
  stressKRW: number
}

export function sigmaRes(w1: number, w2: number, _regime: Regime): number {
  // the uncovered exposure carries the jumps whichever instrument was priced
  const s1 = P1_INPUTS.sigma1EU
  const s2 = P1_INPUTS.sigma2
  const u = 1 - w1
  const v = 1 - w2
  return Math.sqrt(u * u * s1 * s1 + v * v * s2 * s2 + 2 * u * v * s1 * s2 * P1_INPUTS.rho)
}

export function premiumCost(w1: number, w2: number, regime: Regime): number {
  const I = P1_INPUTS
  if (regime === 'european')
    return (
      w1 * I.Q_oil * I.P_B76 * I.S_KRW * (1 + I.r_w * I.T1) +
      w2 * I.Q_USD * I.P_GK * (1 + I.r_w * I.T2)
    )
  return (
    // American: both Shapley shares are KRW/barrel (Paper 2 §8.1), so both
    // scale by Q_oil. Earlier code multiplied the FX share by Q_USD, inflating
    // it by spot (78.94x) — the units bug this fix corrects.
    w1 * I.Q_oil * I.P_Sh_WTI * Math.exp(I.r_w * I.T1) +
    w2 * I.Q_oil * I.P_Sh_FX * Math.exp(I.r_w * I.T2)
  )
}

export function stressLoss(w1: number, w2: number, p: BudgetParams): number {
  const I = P1_INPUTS
  return (
    (1 - w1) * I.Q_oil * Math.max(0, p.stressWTI - I.S_WTI) * p.stressKRW +
    (1 - w2) * I.Q_USD * Math.max(0, p.stressKRW - I.S_KRW)
  )
}

export function totalCost(w1: number, w2: number, p: BudgetParams): number {
  return premiumCost(w1, w2, p.regime) + stressLoss(w1, w2, p)
}

export interface BudgetSolution {
  w1: number
  w2: number
  sigma: number
  cost: number
  premium: number
  stress: number
  feasible: boolean
  budgetBinding: boolean
}

// Constraint set (eq. constraints): 0≤w≤1, w1+w2≤1, C(w)≤B.
// sigma_res is strictly decreasing in both w's over the box, so the optimum
// lies on the north-east boundary of the feasible polygon: scan its edges
// (total-cost-binding line, allocation line, box edges) densely + refine.
export function solveBudget(p: BudgetParams): BudgetSolution {
  const feasible = (w1: number, w2: number) =>
    w1 >= 0 && w1 <= 1 && w2 >= 0 && w2 <= 1 && w1 + w2 <= 1 + 1e-12 && totalCost(w1, w2, p) <= p.B + 1e-3

  let best: { w1: number; w2: number; sigma: number } | null = null
  const consider = (w1: number, w2: number) => {
    if (!feasible(w1, w2)) return
    const s = sigmaRes(w1, w2, p.regime)
    if (!best || s < best.sigma) best = { w1, w2, sigma: s }
  }

  const N = 4000
  // edge 1: cost-binding line — for each w2, largest w1 with C ≤ B (C affine,
  // decreasing in w1 iff avoided stress loss > premium; bisect either way)
  for (let j = 0; j <= N; j++) {
    const w2 = j / N
    let lo = 0
    let hi = 1
    // find max feasible w1 for this w2 (allocation cap first)
    hi = Math.min(1, 1 - w2)
    if (totalCost(hi, w2, p) <= p.B) {
      consider(hi, w2) // NE corner of this column
      continue
    }
    if (totalCost(lo, w2, p) > p.B) continue // whole column infeasible
    for (let it = 0; it < 60; it++) {
      const mid = (lo + hi) / 2
      if (totalCost(mid, w2, p) <= p.B) lo = mid
      else hi = mid
    }
    consider(lo, w2)
  }
  // edge 2 refinement: the allocation line w1+w2=1 and the cost line C=B can
  // cross between grid columns; bisect the crossing so the vertex is hit
  // exactly (the American optimum sits there), not to grid precision
  {
    const f = (w2: number) => totalCost(1 - w2, w2, p) - p.B
    let prev = f(0)
    for (let j = 1; j <= N; j++) {
      const w2 = j / N
      const cur = f(w2)
      if ((prev > 0) !== (cur > 0)) {
        let lo = (j - 1) / N
        let hi = w2
        for (let it = 0; it < 80; it++) {
          const mid = (lo + hi) / 2
          if ((f(mid) > 0) === (prev > 0)) lo = mid
          else hi = mid
        }
        const wx = (lo + hi) / 2
        consider(1 - wx, wx)
      }
      prev = cur
    }
  }
  // corners of the box for completeness
  for (const [a, b] of [[1, 0], [0, 1], [0, 0]] as const) consider(a, b)

  if (!best) {
    const sigma = sigmaRes(0, 0, p.regime)
    return {
      w1: 0, w2: 0, sigma,
      cost: totalCost(0, 0, p),
      premium: 0,
      stress: stressLoss(0, 0, p),
      feasible: false,
      budgetBinding: false,
    }
  }
  const { w1, w2, sigma } = best as { w1: number; w2: number; sigma: number }
  const cost = totalCost(w1, w2, p)
  return {
    w1, w2, sigma, cost,
    premium: premiumCost(w1, w2, p.regime),
    stress: stressLoss(w1, w2, p),
    feasible: true,
    budgetBinding: Math.abs(cost - p.B) < p.B * 1e-4,
  }
}
