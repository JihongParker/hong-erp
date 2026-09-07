// Engine numerical-check suite — runs every frozen-numerics guard in sequence and
// returns a single verdict (exit 1 if ANY check fails). Wired into CI by
// .github/workflows/verify.yml. Run locally: npx tsx scripts/verify-all.mjs
//
// Checks:
//   (a) ESG dual-solver cross-check       — scripts/verify-engine.mjs
//   (b) collar zero-cost parity smoke      — solveZeroCostFloor, |netPremium|<1e-10
//   (c) walk-forward backtest parity smoke — runBacktest vs backtest.json summary
//   (d) P3 CFH accounting anchors          — scripts/verify-cfh.mjs
//   (e) P1 strip ledger + mixed program    — stripLedger/mixedProgram vs paper anchors
//
// (a) and (d) are standalone scripts (they own their process + exit codes), so
// we run them as subprocesses via `npx tsx` and read the status — mirroring how
// the R1 workflow lets npx install the tsx runtime on demand (no devDependency).
// (b) and (c) import the TypeScript engine directly (tsx strips types on import).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { solveZeroCostFloor } from '../src/engine/instruments.ts'
import { runBacktest } from '../src/engine/backtest.ts'
import { stripLedger, mixedProgram, P1_STRIP } from '../src/engine/budget.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const results = []

function runScript(label, rel) {
  process.stdout.write(`\n=== ${label} (${rel}) ===\n`)
  try {
    execFileSync('npx', ['tsx', path.join(root, rel)], { stdio: 'inherit' })
    results.push([label, true])
  } catch {
    results.push([label, false])
  }
}

// ── (a) ESG dual-solver ─────────────────────────────────────────────────────
runScript('a. ESG dual-solver', 'scripts/verify-engine.mjs')

// ── (b) collar zero-cost parity ─────────────────────────────────────────────
process.stdout.write('\n=== b. collar zero-cost parity ===\n')
{
  const m = { F: 100, sigma: 0.3, T: 1, r: 0.02 }
  const caps = [102, 105, 110, 120, 130, 150]
  let worst = 0
  for (const cap of caps) {
    const s = solveZeroCostFloor(cap, m)
    const abs = Math.abs(s.netPremium)
    worst = Math.max(worst, abs)
    console.log(`  cap ${String(cap).padStart(3)} -> floor ${s.floorK.toFixed(3)}  |netPremium| ${abs.toExponential(2)}`)
  }
  const pass = worst < 1e-10
  console.log(`  worst |netPremium| = ${worst.toExponential(2)} (< 1e-10 required) -> ${pass ? 'PASS' : 'FAIL'}`)
  results.push(['b. collar parity', pass])
}

// ── (c) walk-forward backtest parity ────────────────────────────────────────
process.stdout.write('\n=== c. walk-forward backtest parity ===\n')
{
  const bt = JSON.parse(fs.readFileSync(path.join(root, 'src/data/backtest.json'), 'utf8'))
  const out = runBacktest(bt.returns, { window: 60, budget: 1.0, tcBps: 5 })
  const tsWf = out.summary.find((s) => s.policy === 'walkforward')
  const jsonWf = bt.summary.find((s) => s.policy === 'walkforward')
  const diffPp = Math.abs(tsWf.varReduction - jsonWf.var_reduction) * 100
  const pass = diffPp <= 0.5
  console.log(`  TS varReduction   = ${(tsWf.varReduction * 100).toFixed(4)}%  (n=${tsWf.n})`)
  console.log(`  JSON varReduction = ${(jsonWf.var_reduction * 100).toFixed(4)}%`)
  console.log(`  |diff| = ${diffPp.toFixed(4)}pp (<= 0.5pp required) -> ${pass ? 'PASS' : 'FAIL'}`)
  results.push(['c. backtest parity', pass])
}

// ── (d) CFH anchors ─────────────────────────────────────────────────────────
runScript('d. CFH anchors', 'scripts/verify-cfh.mjs')

// ── (e) P1 strip ledger + mixed program ─────────────────────────────────────
{
  console.log('\n=== e. P1 strip ledger + mixed program (closed form vs paper) ===')
  const L = stripLedger()
  const rel = (a, b) => (b === 0 ? Math.abs(a) : Math.abs(a - b) / Math.abs(b))
  const checks = [
    ['K1S', L.K1S, P1_STRIP.K1S, 1e-4],
    ['K2S', L.K2S, P1_STRIP.K2S, 1e-4],
    ['matching saving', L.matchingSaving, P1_STRIP.matchingSaving, 2e-3],
    ['B_year', L.B_year, P1_STRIP.B_year, 0],
  ]
  let ok = true
  for (const [label, got, exp, tol] of checks) {
    const r = rel(got, exp)
    const pass = r <= tol
    ok &&= pass
    console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(16)} = ${(got / 1e9).toFixed(3)}bn (exp ${(exp / 1e9).toFixed(3)}bn, rel ${(r * 100).toFixed(4)}%)`)
  }
  const m0 = mixedProgram(0.02)
  const thr = [
    ['p̄ (eq. pbar)', m0.pBar, 0.0424, 2e-3],
    ['p* (eq. pstar)', m0.pStar, 0.1096, 2e-3],
    ['p† (eq. pdagger)', m0.pDagger, 0.6974, 2e-3],
    ['σ floor (eq. linegmvp)', m0.sigmaFloor, 0.091585, 1e-3],
  ]
  for (const [label, got, exp, tol] of thr) {
    const r = rel(got, exp)
    const pass = r <= tol
    ok &&= pass
    console.log(`  ${pass ? 'ok  ' : 'FAIL'} ${label.padEnd(24)} = ${got.toFixed(4)} (exp ${exp}, rel ${(r * 100).toFixed(3)}%)`)
  }
  const regimes = [[0.02, 'floor'], [0.041, 'pinned'], [0.05, 'vanilla'], [0.4901, 'vanilla']]
  for (const [p, exp] of regimes) {
    const m = mixedProgram(p)
    const pass = m.regime === exp
    ok &&= pass
    console.log(`  ${pass ? 'ok  ' : 'FAIL'} regime(p=${p}) = ${m.regime} (exp ${exp}), ledger ${(m.ledger / 1e9).toFixed(2)}bn`)
  }
  results.push(['e. P1 strip + mixed program', ok])
}

// ── verdict ─────────────────────────────────────────────────────────────────
console.log('\n=== numerical-check summary ===')
let allPass = true
for (const [label, ok] of results) {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}`)
  if (!ok) allPass = false
}
console.log(allPass
  ? '\nALL CHECKS PASSED — engines reproduce the papers at the frozen parameter vector.\n(Numerical agreement only; input-estimation uncertainty is documented per screen.)'
  : '\nCHECKS FAILED')
process.exit(allPass ? 0 : 1)
