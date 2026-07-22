import { chromium } from 'playwright'
const out = process.argv[2] ?? '/tmp'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } })
await page.goto('http://localhost:4200/', { waitUntil: 'networkidle' })
await page.evaluate(() => localStorage.setItem('hongerp-lang', 'ko'))
await page.reload({ waitUntil: 'networkidle' })
// CoA: search for carbon price datapoint
await page.getByRole('button', { name: '계정체계', exact: true }).click()
await page.waitForTimeout(500)
await page.locator('input[type="search"], input[placeholder*="검색"], .cosa-search input').first().fill('carbon')
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/units-coa.png`, clip: { x: 240, y: 100, width: 1180, height: 500 } })
// Metrics entry unit line
await page.getByRole('button', { name: '지표 입력', exact: true }).click()
await page.waitForTimeout(600)
await page.screenshot({ path: `${out}/units-me.png`, clip: { x: 240, y: 100, width: 1180, height: 600 } })
await browser.close()
