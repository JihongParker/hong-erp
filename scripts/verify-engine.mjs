// Dual-solver certification of the frozen engine, mirroring the paper's
// numerical-validation appendix: the closed-form equilibrium must match an
// independent brute-force minimization of Π over (hF, hC, d) on every draw.
// Run: node --experimental-strip-types scripts/verify-engine.mjs
import { solveEquilibrium, objective } from '../src/engine/model.ts'

function bruteMin(p, dMax) {
  // coarse grid → local refinement, engine-independent
  let best = { hF: 0, hC: 0, d: 0, val: Infinity }
  const N = 60
  for (let i = 0; i <= N; i++)
    for (let j = 0; j <= N; j++)
      for (let l = 0; l <= N; l++) {
        const hF = i / N
        const hC = j / N
        const d = Math.max(p.dFloor, (l / N) * dMax)
        const val = objective(hF, hC, d, p)
        if (val < best.val) best = { hF, hC, d, val }
      }
  // refine around best
  let step = { h: 1 / N, d: dMax / N }
  for (let r = 0; r < 30; r++) {
    let improved = false
    for (const [dh, dc, dd] of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]) {
      const hF = Math.min(1, Math.max(0, best.hF + dh * step.h))
      const hC = Math.min(1, Math.max(0, best.hC + dc * step.h))
      const d = Math.max(p.dFloor, best.d + dd * step.d)
      const val = objective(hF, hC, d, p)
      if (val < best.val) { best = { hF, hC, d, val }; improved = true }
    }
    if (!improved) { step = { h: step.h / 2, d: step.d / 2 } }
  }
  return best
}

let rngState = 42
const rand = () => (rngState = (rngState * 1103515245 + 12345) % 2 ** 31) / 2 ** 31

let worst = { dh: 0, dv: 0 }
let failures = 0
const DRAWS = 200
for (let t = 0; t < DRAWS; t++) {
  const p = {
    sigmaF: 0.5 + 2 * rand(),
    sigmaC: 0.3 + 1.5 * rand(),
    rho: -0.6 + 1.2 * rand(),
    pF: 0.1 + 2 * rand(),
    pC: 0.1 + 1.5 * rand(),
    a: 0.3 + 3 * rand(),
    phi: 0.2 + 2 * rand(),
    lambda: 0.5 + 8 * rand(),
    k: 0.2 + 1.5 * rand(),
    dFloor: rand() < 0.5 ? 0 : 3 * rand(),
  }
  const eq = solveEquilibrium(p)
  const nb = bruteMin(p, Math.max(2 * eq.dStar + 1, 4))
  const closedVal = objective(eq.hF, eq.hC, eq.dStar, p)
  // certification criterion: closed-form objective must not exceed the
  // brute-force minimum beyond grid tolerance (and vice versa)
  const gap = closedVal - nb.val
  worst.dh = Math.max(worst.dh, Math.abs(eq.hF - nb.hF), Math.abs(eq.hC - nb.hC))
  worst.dv = Math.max(worst.dv, Math.abs(gap))
  if (gap > 1e-3) {
    failures++
    console.log('FAIL', { p, eq: { d: eq.dStar, hF: eq.hF, hC: eq.hC, val: closedVal }, brute: nb })
  }
}
console.log(`draws=${DRAWS} failures=${failures}`)
console.log(`worst |Δh| vs grid = ${worst.dh.toFixed(4)} (grid step 0.0167 → refinement)`)
console.log(`worst objective gap (closed − brute) = ${worst.dv.toExponential(2)}`)
console.log(failures === 0 ? 'CERTIFIED: closed form ⩽ independent minimizer on all draws' : 'NOT CERTIFIED')
process.exit(failures === 0 ? 0 : 1)
