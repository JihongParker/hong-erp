// FROZEN — Park, "Optimal WTI–FX Hedge Ratios Under a Fixed Budget: A
// Maturity-Matched Strip Program with a Tail Objective" (P1), revision
// 2026-08-24. The live program below is the paper's variance/stress benchmark
// ledger (eq. gmvp, costeu, costam) plus the §7–8 instrument switch; the
// paper's headline strip + CVaR results are pinned in P1_STRIP (computed by
// python/01_budget/cvar_strip.py -> data/results/cvar_strip_results.json).
// Variance-line anchor (both regimes, eq. linegmvp): (0.9660, 0.0340).
//
// §Limitations (2026-07-23 revision) — CORRELATION IS THE BINDING UNCERTAINTY.
// The 0.97/0.03 split is a closed-form consequence of the variance ratio and a
// single unconditional rho = 0.0876 estimated over 1,299 daily observations of
// a largely calm sample. The paper is explicit that the §6.5 invariance result
// (a 10% inflation of both volatilities leaves the split unchanged) is NOT
// robustness to correlation risk: proportional inflation preserves the variance
// ratio and hence the split, a change in rho does not. Under the correlation
// breakdown characteristic of stressed regimes — the joint WTI-spike /
// KRW-depreciation event this hedge is bought against — the same closed form
// returns a different split. sigmaRes therefore takes rho as a parameter so the
// desk can price that scenario rather than assume it away.

export type Regime = 'european' | 'american'

// P1 headline results — the maturity-matched strip and the CVaR program.
// Pinned from data/results/cvar_strip_results.json (2026-08-24 run).
export const P1_STRIP = {
  B_year: 540e9, // annual strip authority = 12 x 45bn
  K1S: 399.753e9, // full WTI strip premium, 12 matched slices
  K2S: 167.741e9, // full FX strip premium, co-termed slices
  matchingSaving: 95.3e9, // vs twelve uniform 0.833y contracts (19.3%)
  cvar95: {
    kappa1: { w1: 1.0, w2: 0.0, cvar: 151.4e9 }, // one envelope: authority slack
    kappa2: { w1: 1.0, w2: 0.8361, cvar: -235.8e9 }, // separate books: authority spent exactly
    shadowPerBn: 2.6e9, // dCVaR95 per bn of authority at 540bn (kappa=2)
  },
  fxMaturity: { capSavingMax: 14.1e9, capTailCost: 77.0e9 }, // 0.5y-cap verdict: co-term
} as const

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
  p_KO_stress: 0.8925, // KO probability, contract newly struck at the stress spot (200k paths)
  p_KO_held: 0.4901, // KO probability of the held contract, conditional on reaching the stress band
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
  /** WTI–FX correlation. Defaults to the calm-sample estimate rho = 0.0876;
   *  stress it toward +-1 to price the correlation-breakdown case. */
  rho?: number
}

export function sigmaRes(w1: number, w2: number, _regime: Regime, rho: number = P1_INPUTS.rho): number {
  // the uncovered exposure carries the jumps whichever instrument was priced
  const s1 = P1_INPUTS.sigma1EU
  const s2 = P1_INPUTS.sigma2
  const u = 1 - w1
  const v = 1 - w2
  return Math.sqrt(u * u * s1 * s1 + v * v * s2 * s2 + 2 * u * v * s1 * s2 * rho)
}

// The minimum-variance split with the budget deleted (paper eq. linegmvp).
// Exposed so the desk can show how far the reported allocation travels when the
// correlation input moves, which the §6.5 volatility-inflation check cannot show.
export function unconstrainedSplit(rho: number = P1_INPUTS.rho): { w1: number; w2: number } {
  const s1 = P1_INPUTS.sigma1EU
  const s2 = P1_INPUTS.sigma2
  const den = s1 * s1 + s2 * s2 - 2 * rho * s1 * s2
  const w1 = (s1 * s1 - rho * s1 * s2) / den
  return { w1, w2: 1 - w1 }
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
    // scale by Q_oil. Carry is the paper's linear (1 + r_w T) on every leg
    // (eq. pdagger, C(1,0) = KRW 33,425,495,704 in eq. pstar).
    w1 * I.Q_oil * I.P_Sh_WTI * (1 + I.r_w * I.T1) +
    w2 * I.Q_oil * I.P_Sh_FX * (1 + I.r_w * I.T2)
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
    const s = sigmaRes(w1, w2, p.regime, p.rho)
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
    const sigma = sigmaRes(0, 0, p.regime, p.rho)
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


// ─────────────────────────────────────────────────────────────────────────────
// P1 §2–5 — the maturity-matched strip, priced live in closed form.
// Slice m covers month m's procurement with options expiring at T_m = m/12;
// strikes are 5% out of the money on both legs (K = 0.95·S). WTI slices are
// Black-76 on the flat forward at the historical σ₁ = 0.3946 discounted at
// r_US; FX slices are Garman–Kohlhagen mid at σ₂ discounted at r_KRW / r_US.
// Each premium is funded at the WACC over its own tenor, (1 + r_w·T_m).
//   K₁ˢ = Σ_m Q_oil·P_B76(T_m)·S_KRW·(1+r_wT_m)   = KRW 399.75bn  (paper eq. strip)
//   K₂ˢ = Σ_m Q_USD·P_GK(T_m)·(1+r_wT_m)          = KRW 167.74bn
// Twelve uniform 0.833y contracts would cost 12 × 41.26bn = 495.1bn on the WTI
// leg; matching saves 95.3bn (19.3%). The CVaR₉₅ program on top of this ledger
// needs the 200k-path bank and stays pinned in P1_STRIP.
export const STRIP_RATES = { rUS: 0.04, rKRW: 0.035, moneyness: 0.95 } as const

function normCdf(x: number): number {
  // Abramowitz–Stegun 7.1.26, |err| < 7.5e-8
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const poly =
    t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  const tail = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI) * poly
  return x >= 0 ? 1 - tail : tail
}

export function black76(F: number, K: number, sig: number, T: number, r: number): number {
  const sq = sig * Math.sqrt(T)
  const d1 = (Math.log(F / K) + 0.5 * sig * sig * T) / sq
  return Math.exp(-r * T) * (F * normCdf(d1) - K * normCdf(d1 - sq))
}

export function garmanKohlhagen(S: number, K: number, sig: number, T: number, rd: number, rf: number): number {
  const sq = sig * Math.sqrt(T)
  const d1 = (Math.log(S / K) + (rd - rf + 0.5 * sig * sig) * T) / sq
  return S * Math.exp(-rf * T) * normCdf(d1) - K * Math.exp(-rd * T) * normCdf(d1 - sq)
}

export interface StripSlice {
  m: number // month 1..12
  T: number // maturity in years, m/12
  pB76: number // USD/bbl
  pGK: number // KRW/USD
  wtiPremium: number // KRW, full coverage, funded
  fxPremium: number // KRW, full coverage, funded
}

export interface StripLedger {
  slices: StripSlice[]
  K1S: number // full WTI strip premium, KRW
  K2S: number // full FX strip premium, KRW
  uniformK1: number // 12 uniform 0.833y WTI contracts, KRW
  matchingSaving: number // uniformK1 − K1S
  matchingSavingPct: number
  UL1: number // annual full-exposure stress loss, WTI leg
  UL2: number // annual full-exposure stress loss, FX leg
  B_year: number
}

export function stripLedger(): StripLedger {
  const I = P1_INPUTS
  const R = STRIP_RATES
  const K1 = R.moneyness * I.S_WTI
  const K2 = R.moneyness * I.S_KRW
  const slices: StripSlice[] = []
  for (let m = 1; m <= 12; m++) {
    const T = m / 12
    const pB76 = black76(I.S_WTI, K1, I.sigma1EU, T, R.rUS)
    const pGK = garmanKohlhagen(I.S_KRW, K2, I.sigma2, T, R.rKRW, R.rUS)
    const carry = 1 + I.r_w * T
    slices.push({
      m, T, pB76, pGK,
      wtiPremium: I.Q_oil * pB76 * I.S_KRW * carry,
      fxPremium: I.Q_USD * pGK * carry,
    })
  }
  const K1S = slices.reduce((a, s) => a + s.wtiPremium, 0)
  const K2S = slices.reduce((a, s) => a + s.fxPremium, 0)
  const uniformK1 =
    12 * I.Q_oil * black76(I.S_WTI, K1, I.sigma1EU, I.T1, R.rUS) * I.S_KRW * (1 + I.r_w * I.T1)
  return {
    slices, K1S, K2S, uniformK1,
    matchingSaving: uniformK1 - K1S,
    matchingSavingPct: (uniformK1 - K1S) / uniformK1,
    UL1: 12 * I.Q_oil * Math.max(0, I.stressWTI - I.S_WTI) * I.stressKRW,
    UL2: 12 * I.Q_USD * Math.max(0, I.stressKRW - I.S_KRW),
    B_year: 12 * I.B,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// P1 §7–8 — the mixed vanilla/knock-out program on the longest slice (T = 0.833),
// solved live (paper eq. mixprog / mixledger). The WTI book splits into a vanilla
// Black-76 leg that survives stress and a standalone KO leg that dies with
// probability p; the ledger charges the KO leg's stress loss with survival
// probability only. The split is bang-bang at p̄ = (P_V − P_K)/UL_WTI = 0.0424,
// and the program has three regimes (paper fig. mixswitch):
//   floor   (p ≤ 0.0390): all-KO ledger leaves the budget slack, the unconstrained
//                         variance floor σ_res = 0.0916 is attained
//   pinned  (0.0390 < p < p̄): all-KO branch, budget binding, σ_res rises
//   vanilla (p ≥ p̄): all-vanilla book, ledger reads KRW 45.00bn
// Two further closed-form thresholds for the pure-KO book (eq. pstar, pdagger):
//   p* = (B − C(1,0))/UL_WTI = 0.1096 — beyond it no allocation keeps the
//        survival-adjusted ledger within the authority
//   p† = 1 − Q·P_Sh·(1+r_wT₁)/UL_WTI = 0.6974 — beyond it coverage no longer pays
export const P1_SLICE = {
  P_V: 41_258_998_746, // full-coverage vanilla WTI slice premium, funded (eq. pbar numerator)
  P_K: 36_780_738_568, // standalone single-asset LSMC American KO call, funded (eq. pbar)
} as const

export type MixRegime = 'floor' | 'pinned' | 'vanilla'

export interface MixedProgram {
  p: number
  pBar: number
  pStar: number
  pDagger: number
  regime: MixRegime
  koShare: 0 | 1
  w1: number
  w2: number
  sigma: number
  sigmaFloor: number // unconstrained variance floor
  ledger: number // survival-adjusted ledger at the optimum
  budgetBinding: boolean
  feasible: boolean
  pureKoLedger: number // all-KO book at the adopted (1,0)-branch allocation, eq. sadj
}

function sliceFxPremium(): number {
  const I = P1_INPUTS
  return I.Q_USD * I.P_GK * (1 + I.r_w * I.T2)
}

function sliceStressLoss(): { UL_WTI: number; UL_FX: number } {
  const I = P1_INPUTS
  return {
    UL_WTI: I.Q_oil * Math.max(0, I.stressWTI - I.S_WTI) * I.stressKRW,
    UL_FX: I.Q_USD * Math.max(0, I.stressKRW - I.S_KRW),
  }
}

// Minimise σ_res over {0≤w≤1, w1+w2≤1, cost(w)≤B} for any affine cost — the
// same boundary scan solveBudget uses.
function minSigmaOnPolygon(
  cost: (w1: number, w2: number) => number,
  B: number,
  rho: number,
): { w1: number; w2: number; sigma: number } | null {
  const feasible = (w1: number, w2: number) =>
    w1 >= 0 && w1 <= 1 && w2 >= 0 && w2 <= 1 && w1 + w2 <= 1 + 1e-12 && cost(w1, w2) <= B + 1e-3
  let best: { w1: number; w2: number; sigma: number } | null = null
  const consider = (w1: number, w2: number) => {
    if (!feasible(w1, w2)) return
    const s = sigmaRes(w1, w2, 'european', rho)
    if (!best || s < best.sigma) best = { w1, w2, sigma: s }
  }
  const N = 4000
  for (let j = 0; j <= N; j++) {
    const w2 = j / N
    let lo = 0
    let hi = Math.min(1, 1 - w2)
    if (cost(hi, w2) <= B) {
      consider(hi, w2)
      continue
    }
    if (cost(lo, w2) > B) continue
    for (let it = 0; it < 60; it++) {
      const mid = (lo + hi) / 2
      if (cost(mid, w2) <= B) lo = mid
      else hi = mid
    }
    consider(lo, w2)
  }
  {
    const f = (w2: number) => cost(1 - w2, w2) - B
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
  for (const [a, b] of [[1, 0], [0, 1], [0, 0]] as const) consider(a, b)
  return best
}

export function mixedProgram(p: number, B: number = P1_INPUTS.B, rho: number = P1_INPUTS.rho): MixedProgram {
  const I = P1_INPUTS
  const { UL_WTI, UL_FX } = sliceStressLoss()
  const P_FX = sliceFxPremium()
  const pBar = (P1_SLICE.P_V - P1_SLICE.P_K) / UL_WTI
  const pureKoC10 = premiumCost(1, 0, 'american') + UL_FX // C(1,0), eq. pstar
  const pStar = (B - pureKoC10) / UL_WTI
  const pDagger = 1 - (I.Q_oil * I.P_Sh_WTI * (1 + I.r_w * I.T1)) / UL_WTI
  const koShare: 0 | 1 = p < pBar ? 1 : 0
  const cost = (w1: number, w2: number) =>
    koShare === 1
      ? w1 * P1_SLICE.P_K + w2 * P_FX + (1 - w1 * (1 - p)) * UL_WTI + (1 - w2) * UL_FX
      : w1 * P1_SLICE.P_V + w2 * P_FX + (1 - w1) * UL_WTI + (1 - w2) * UL_FX
  const free = unconstrainedSplit(rho)
  const sigmaFloor = sigmaRes(free.w1, free.w2, 'european', rho)
  const best = minSigmaOnPolygon(cost, B, rho)
  const pureKoLedger = pureKoC10 + p * UL_WTI
  if (!best) {
    return {
      p, pBar, pStar, pDagger, regime: koShare === 1 ? 'pinned' : 'vanilla', koShare,
      w1: 0, w2: 0, sigma: sigmaRes(0, 0, 'european', rho), sigmaFloor,
      ledger: cost(0, 0), budgetBinding: false, feasible: false, pureKoLedger,
    }
  }
  const ledger = cost(best.w1, best.w2)
  const budgetBinding = Math.abs(ledger - B) < B * 1e-4
  const regime: MixRegime = koShare === 0 ? 'vanilla' : budgetBinding ? 'pinned' : 'floor'
  return {
    p, pBar, pStar, pDagger, regime, koShare,
    w1: best.w1, w2: best.w2, sigma: best.sigma, sigmaFloor,
    ledger, budgetBinding, feasible: true, pureKoLedger,
  }
}
