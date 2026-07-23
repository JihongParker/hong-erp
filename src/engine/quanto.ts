// European call on WTI settled in won — the barrier-free ablation baseline for
// the Double-KO structure. Same jump-diffusion calibration as the paper's
// surface, priced in closed form (Merton jump series), so the difference
// Double-KO − European isolates what the two knock-out barriers take away.
//
// NOTE (paper revision 2026-07-23, Proposition 1). This payoff converts at the
// REALIZED terminal rate, so a change of numeraire to the USD money-market
// account gives V(0) = S2(0)·e^(−r_US·T)·E^Q_US[(S1−K)+], in which ρ does not
// appear: the structure factorizes and is not a quanto in the technical sense
// of carrying a correlation-dependent drift adjustment. The −ρσ₁σ₂ term below
// is the KRW-numeraire drift correction that makes the joint simulation agree
// with that factorization; it is not a price effect of correlation. The
// correlation remains economically real on the HEDGING side, which is where
// the paper's c* lives.
//
// Convention: the asset (WTI, USD) pays max(S_T − K, 0) converted to KRW at the
// fixed quanto rate S₂₀; value is "KRW per quanto unit at S₂₀", matching the
// surface (which then rescales by live FX / S₂₀ through the V/S₂ homogeneity thm).

export interface QuantoCalib {
  sigma1: number // WTI diffusion vol
  lambda: number // jump intensity
  thetaJ: number // jump mean (log)
  deltaJ: number // jump vol (log)
  sigma2: number // FX vol
  rho: number // WTI–FX correlation (the quanto link)
  rUS: number // asset (foreign) rate
  rKRW: number // domestic discount rate
  S2_0: number // fixed quanto FX rate
}

function normCdf(x: number): number {
  // Abramowitz–Stegun 7.1.26
  const t = 1 / (1 + (0.3275911 * Math.abs(x)) / Math.SQRT2)
  const erf =
    1 -
    (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp((-x * x) / 2))
  return x >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf)
}

// USD-side quanto call per unit S₂ (i.e. value_KRW = S2_0 × this). Forward form:
// each Merton component is a Black-76 call on the quanto forward Fₙ.
function quantoCallUSD(S: number, K: number, T: number, c: QuantoCalib): number {
  const { sigma1: sig, lambda, thetaJ, deltaJ, rho, sigma2, rUS, rKRW } = c
  const kBar = Math.exp(thetaJ + 0.5 * deltaJ * deltaJ) - 1 // E[Y−1]
  // quanto risk-neutral asset drift: foreign rate minus the covariance correction
  const rQuanto = rUS - rho * sig * sigma2
  const disc = Math.exp(-rKRW * T)
  let price = 0
  for (let n = 0; n <= 60; n++) {
    const wn = Math.exp(-lambda * T) * Math.pow(lambda * T, n) // Poisson weight (physical λ)
    const wfact = wn / factorial(n)
    if (n > 5 && wfact < 1e-12) break
    const sigN = Math.sqrt(sig * sig + (n * deltaJ * deltaJ) / T)
    // per-component drift keeps the total a martingale at rQuanto: subtract the
    // jump compensator λk̄ and add the realised n-jump mean n·ln(1+k̄)
    const rn = rQuanto - lambda * kBar + (n * Math.log(1 + kBar)) / T
    const Fn = S * Math.exp(rn * T)
    const sT = sigN * Math.sqrt(T)
    const d1 = (Math.log(Fn / K) + 0.5 * sT * sT) / sT
    const d2 = d1 - sT
    price += wfact * disc * (Fn * normCdf(d1) - K * normCdf(d2))
  }
  return price
}

function factorial(n: number): number {
  let f = 1
  for (let i = 2; i <= n; i++) f *= i
  return f
}

export interface QuantoResult {
  value: number // KRW per unit at S₂₀
  deltaWTI: number // ∂value/∂S (KRW per $)
  deltaFX: number // V/S₂ homogeneity FX delta
}

// European quanto value (KRW/unit at S₂₀) and its WTI delta by central difference.
export function europeanQuanto(S: number, K: number, T: number, c: QuantoCalib): QuantoResult {
  const value = c.S2_0 * quantoCallUSD(S, K, T, c)
  const h = 0.01 * S
  const up = c.S2_0 * quantoCallUSD(S + h, K, T, c)
  const dn = c.S2_0 * quantoCallUSD(S - h, K, T, c)
  return { value, deltaWTI: (up - dn) / (2 * h), deltaFX: value / c.S2_0 }
}
