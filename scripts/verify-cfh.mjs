// P3 CFH anchor test — asserts the frozen paper-engine output in
// src/data/cfh_summary.json still reproduces the certified accounting anchors
// that the Accounting module (src/modules/Accounting.tsx) renders:
//   mean |ineffectiveness| A ~= 23.4bn KRW, B ~= 6.4bn KRW,
//   post-KO FVTPL noise (sigma) ~= 71.9bn KRW,
//   combined-quanto option premium ~= 34,264,941,589 KRW.
// Tolerance: 1% relative. Exit 1 on any breach.
// Run: npx tsx scripts/verify-cfh.mjs  (or node scripts/verify-cfh.mjs)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cfh = JSON.parse(fs.readFileSync(path.join(root, 'src/data/cfh_summary.json'), 'utf8'))
const S = cfh.stats

// [field, human label, expected, relative tolerance]
const anchors = [
  ['ineffA', 'mean |ineffectiveness| A', 23.4e9, 0.01],
  ['ineffB', 'mean |ineffectiveness| B', 6.4e9, 0.01],
  ['postKoFvtplStdB', 'post-KO FVTPL noise (sigma) B', 71.9e9, 0.01],
  ['premium', 'combined-quanto option premium', 34264941589, 0.01],
]

const bn = (v) => `${(v / 1e9).toFixed(3)}bn`
let failures = 0
console.log('CFH anchor check (src/data/cfh_summary.json, tol 1% rel):')
for (const [field, label, expected, tol] of anchors) {
  const actual = S[field]
  if (typeof actual !== 'number' || !Number.isFinite(actual)) {
    console.log(`  FAIL ${field} (${label}): missing/non-numeric`)
    failures++
    continue
  }
  const rel = Math.abs(actual - expected) / Math.abs(expected)
  const ok = rel <= tol
  if (!ok) failures++
  console.log(
    `  ${ok ? 'ok  ' : 'FAIL'} ${field.padEnd(16)} = ${bn(actual)} (exp ${bn(expected)}, rel ${(rel * 100).toFixed(3)}%) — ${label}`,
  )
}

if (failures === 0) {
  console.log('CFH anchors OK')
  process.exit(0)
} else {
  console.log(`CFH anchors FAILED (${failures} breach${failures === 1 ? '' : 'es'})`)
  process.exit(1)
}
