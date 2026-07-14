import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 980 } })
const nav = (label) => page.locator('.nav-item', { hasText: label }).click()
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })

// ── 1. Metrics: submit for Chemicals ──
await nav('Metrics Entry')
await page.waitForTimeout(300)
const pendingBefore = await page.locator('.me-qitem').count()
await page.locator('.me-tab', { hasText: 'Chemicals' }).click()
await page.locator('.me-select select').selectOption({ index: 12 })
await page.locator('.me-inline input').fill('12345')
await page.locator('.me-evidence input').check()
await page.getByRole('button', { name: 'Submit for review' }).click()
await page.waitForTimeout(300)
const pendingAfter = await page.locator('.me-qitem').count()
console.log(`submit: queue ${pendingBefore} -> ${pendingAfter} (${pendingAfter === pendingBefore + 1 ? 'OK' : 'FAIL'})`)
await page.screenshot({ path: `${out}/erp-metrics.png`, fullPage: true })

// ── 2. approve the first pending item ──
await page.locator('.me-qitem').first().getByRole('button', { name: 'Approve' }).click()
await page.waitForTimeout(300)
const approvedVisible = await page.locator('.act li', { hasText: 'approved' }).count()
console.log(`approve: activity shows approval (${approvedVisible > 0 ? 'OK' : 'FAIL'})`)

// ── 3. book a collar for Materials ──
await nav('Hedge Instruments')
await page.waitForTimeout(400)
await page.locator('.ins-binline select').selectOption('materials')
await page.locator('.ins-binline input').fill('0.75')
await page.getByRole('button', { name: 'Book collar' }).click()
await page.waitForTimeout(300)
const flash = await page.locator('.ins-bookflash').textContent()
console.log(`book: ${flash?.slice(0, 40)}...`)
await page.screenshot({ path: `${out}/erp-book.png` })

// ── 4. blotter shows it; change designation ──
await nav('Hedge Accounting')
await page.waitForTimeout(400)
const rows = await page.locator('.ac-blotter tbody tr').count()
const firstRow = await page.locator('.ac-blotter tbody tr').first().textContent()
console.log(`blotter: ${rows} trades, newest: ${firstRow?.slice(0, 60)} (${rows >= 4 && firstRow?.includes('Materials') ? 'OK' : 'FAIL'})`)
await page.locator('.ac-desig').first().selectOption('FVTPL')
await page.waitForTimeout(300)
await page.screenshot({ path: `${out}/erp-blotter.png`, fullPage: true })

// ── 5. dashboard division book + feed reflect everything ──
await nav('Decision Dashboard')
await page.waitForTimeout(400)
const matCard = await page.locator('.db-div', { hasText: 'Materials' }).textContent()
const feedTop = await page.locator('.act li').first().textContent()
console.log(`divbook Materials: ${matCard?.replace(/\s+/g, ' ').slice(0, 90)}`)
console.log(`feed top: ${feedTop?.replace(/\s+/g, ' ').slice(0, 80)}`)
await page.screenshot({ path: `${out}/erp-dash.png`, fullPage: true })

// ── 6. persistence: reload, records survive ──
await page.reload({ waitUntil: 'networkidle' })
await nav('Hedge Accounting')
await page.waitForTimeout(400)
const rowsAfterReload = await page.locator('.ac-blotter tbody tr').count()
const desigAfterReload = await page.locator('.ac-desig').first().inputValue()
console.log(`persistence: ${rowsAfterReload} trades, first designation=${desigAfterReload} (${rowsAfterReload === rows && desigAfterReload === 'FVTPL' ? 'OK' : 'FAIL'})`)

// ── 7. scenario edit persists to store ──
await nav('Scenarios')
await page.waitForTimeout(300)
await page.locator('.sc-sliders input').first().fill('10')
await page.waitForTimeout(200)
await nav('Decision Dashboard')
await page.waitForTimeout(300)
const refCard = await page.locator('.db-div', { hasText: 'Refining' }).textContent()
console.log(`scenario->store: Refining card after lambda=10: ${refCard?.replace(/\s+/g, ' ').slice(0, 70)}`)
await browser.close()
console.log('E2E DONE')
