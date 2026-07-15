// TEXTBOOK FOIL — deliberately NOT the paper engine. A one-factor Cox–Ross–
// Rubinstein binomial for a European double-knock-out call under plain GBM:
//   • no jumps (the paper's λ, θ_J, δ_J are invisible to it)
//   • no quanto FX correlation (no −ρσ₁σ₂ drift adjustment, no c*)
//   • no Brownian-bridge continuity correction (barriers checked only at nodes)
//
// It exists to show, on the same screen as the paper's jump-diffusion quanto MC
// surface, exactly where the standard desk lattice diverges: it undershoots the
// knock-out probability (it cannot see the jump variance), its price/KO odds
// oscillate as the barriers straddle lattice nodes, and its delta never reverses
// sign — it is blind to the barrier squeeze. Do not price the real structure with it.

export interface LatticeParams {
  S0: number
  K: number
  U: number // upper knock-out barrier
  L: number // lower knock-out barrier
  sigma: number
  T: number
  r: number
  N: number // number of time steps
}

export interface LatticeResult {
  koProb: number // risk-neutral P(hit either barrier before T)
  call: number // value of the double-KO call (rebate 0)
}

// One CRR pass: backward induction for the option value (KO nodes zeroed) and a
// forward pass for the surviving probability mass. Discrete monitoring at nodes.
export function crrDoubleKO(p: LatticeParams): LatticeResult {
  const { S0, K, U, L, sigma, T, r, N } = p
  const dt = T / N
  const u = Math.exp(sigma * Math.sqrt(dt))
  const d = 1 / u
  const q = (Math.exp(r * dt) - d) / (u - d) // risk-neutral up probability
  const disc = Math.exp(-r * dt)

  // node price after i steps, j ups: S = S0 · u^(2j − i)
  const alive = (i: number, j: number): boolean => {
    const S = S0 * Math.pow(u, 2 * j - i)
    return S > L && S < U
  }

  // ── option value: backward induction, continuation killed at breached nodes ──
  const val = new Float64Array(N + 1)
  for (let j = 0; j <= N; j++) {
    const S = S0 * Math.pow(u, 2 * j - N)
    val[j] = alive(N, j) ? Math.max(S - K, 0) : 0
  }
  for (let i = N - 1; i >= 0; i--) {
    for (let j = 0; j <= i; j++) {
      const cont = disc * (q * val[j + 1] + (1 - q) * val[j])
      val[j] = alive(i, j) ? cont : 0
    }
  }
  const call = val[0]

  // ── knock-out probability: forward-propagate risk-neutral mass, drop breaches ──
  let prob = new Float64Array(N + 1)
  prob[0] = alive(0, 0) ? 1 : 0
  for (let i = 1; i <= N; i++) {
    const next = new Float64Array(N + 1)
    for (let j = 0; j <= i; j++) {
      let m = 0
      if (j - 1 >= 0) m += prob[j - 1] * q // up from (i−1, j−1)
      if (j <= i - 1) m += prob[j] * (1 - q) // down from (i−1, j)
      next[j] = alive(i, j) ? m : 0
    }
    prob = next
  }
  let survive = 0
  for (let j = 0; j <= N; j++) survive += prob[j]
  return { koProb: 1 - survive, call }
}

// Central-difference delta of the double-KO call (bump spot, same lattice).
export function crrDelta(p: LatticeParams, bump = 0.01): number {
  const up = crrDoubleKO({ ...p, S0: p.S0 * (1 + bump) }).call
  const dn = crrDoubleKO({ ...p, S0: p.S0 * (1 - bump) }).call
  return (up - dn) / (2 * p.S0 * bump)
}

// KO probability across a range of step counts — the convergence diagnostic.
// Barrier lattices do not converge smoothly: as N grows the barriers straddle
// nodes differently and the estimate oscillates (Boyle–Lau node problem).
export function koConvergence(p: Omit<LatticeParams, 'N'>, Ns: number[]): { N: number; koProb: number }[] {
  return Ns.map((N) => ({ N, koProb: crrDoubleKO({ ...p, N }).koProb }))
}
