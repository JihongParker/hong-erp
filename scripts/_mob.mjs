// scripts/_mob.mjs — 390px에서 모듈별 document.scrollWidth-clientWidth와 범인 요소 출력
// 모듈 이동: body 클릭으로 드로어 상태 초기화 → .nav-toggle 열기 → 드로어에서 이름 클릭.
// 사용법: node scripts/_mob.mjs [port]   (기본 4200)
import { chromium } from 'playwright'

const PORT = process.argv[2] || '4200'
const URL = `http://localhost:${PORT}/`

const MODULES = [
  ['Decision Dashboard', 'decision'],
  ['Hedge Budget', 'budget'],
  ['Hedge Instruments', 'instruments'],
  ['Hedge Accounting', 'accounting'],
  ['Chart of Accounts', 'cosa'],
  ['Materiality', 'materiality'],
  ['Metrics Entry', 'metrics'],
  ['Disclosure report', 'report'],
  ['Scenarios', 'scenario'],
  ['Out-of-sample', 'backtest'],
  ['Audit trail', 'audittrail'],
]

const probe = () => {
  const docEl = document.documentElement
  const vw = docEl.clientWidth
  // Neutralise the max-width:860px `body{overflow-x:clip}` safety net so this
  // measurement reflects GENUINE page overflow (root causes), not the guard.
  const kill = document.createElement('style')
  kill.textContent = 'html,body{overflow-x:visible !important}'
  document.head.appendChild(kill)
  void docEl.offsetWidth // force reflow
  const overflowX = docEl.scrollWidth - vw // genuine page horizontal scroll, guard disabled
  const pageH = docEl.scrollHeight
  // an element only causes PAGE overflow if no ancestor clips the x-axis
  const inScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') return true
    }
    return false
  }
  const bad = []
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    if (r.right > vw + 1 && !inScroller(el)) {
      let cls = ''
      if (typeof el.className === 'string' && el.className.trim()) cls = '.' + el.className.trim().split(/\s+/).join('.')
      bad.push({ sel: el.tagName.toLowerCase() + cls, w: Math.round(r.width), right: Math.round(r.right) })
    }
  }
  document.head.removeChild(kill)
  bad.sort((a, b) => b.right - a.right || b.w - a.w)
  return { vw, overflowX, pageH, bad: bad.slice(0, 8) }
}

async function goModule(page, label) {
  await page.mouse.click(5, 5).catch(() => {}) // reset drawer state
  const expanded = await page.getAttribute('.nav-toggle', 'aria-expanded').catch(() => 'false')
  if (expanded !== 'true') await page.click('.nav-toggle')
  await page.waitForSelector('.sidebar.open', { timeout: 3000 })
  await page.waitForTimeout(320)
  await page.locator('.nav-item', { hasText: label }).first().click()
  await page.waitForTimeout(520)
}

// overflowX = genuine page horizontal scroll with the clip guard disabled (root-cause truth).
// culprits = only elements that overflow the viewport and are NOT inside an overflow-x scroller.
const fmt = (r) =>
  `overflowX=${r.overflowX}px  pageH=${r.pageH}px` +
  (r.overflowX > 1 ? '\n    culprits: ' + r.bad.map((b) => `${b.sel} [w${b.w} r${b.right}]`).join('\n              ') : '')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)

// Overview (landing)
console.log('=== 390px per-module horizontal overflow ===')
let ov = await page.evaluate(probe)
console.log(`overview            ${fmt(ov)}`)

for (const [label, id] of MODULES) {
  await goModule(page, label)
  const r = await page.evaluate(probe)
  console.log(`${id.padEnd(20)}${fmt(r)}`)
  if (id === 'instruments') {
    // Exotic/Quanto desk is the second tab — measure .ex-* too
    await page.locator('.ins-tab').nth(1).click().catch(() => {})
    await page.waitForTimeout(450)
    const ex = await page.evaluate(probe)
    console.log(`${'instruments(exotic)'.padEnd(20)}${fmt(ex)}`)
  }
}

// Overview page height (compression target)
await page.mouse.click(5, 5).catch(() => {})
const expanded = await page.getAttribute('.nav-toggle', 'aria-expanded').catch(() => 'false')
if (expanded !== 'true') await page.click('.nav-toggle')
await page.waitForSelector('.sidebar.open', { timeout: 3000 })
await page.waitForTimeout(300)
await page.locator('.nav-item', { hasText: 'Overview' }).first().click()
await page.waitForTimeout(700)
ov = await page.evaluate(probe)
console.log(`\n=== overview compression ===`)
console.log(`overview            ${fmt(ov)}`)
console.log(`\nSUMMARY overview.pageH=${ov.pageH}`)

await browser.close()
