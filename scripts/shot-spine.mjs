import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1360, height: 700 } })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
// 1. dashboard shows Materiality+Budget chips at defaults
await page.screenshot({ path: `${out}/spine-dash.png` })
// 2. move exotic desk spot to 112 → Accounting chip must show ~84.7%
await page.getByRole('button', { name: 'Hedge Instruments' }).click()
await page.getByRole('button', { name: /Double-KO quanto/ }).click()
const spot = page.locator('.ex-panel label', { hasText: 'WTI spot' }).locator('input')
await spot.fill('112')
await page.waitForTimeout(200)
await page.getByRole('button', { name: 'Hedge Accounting' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: `${out}/spine-accounting.png` })
// 3. materiality threshold to 2.5 → Dashboard chip count changes
await page.getByRole('button', { name: 'Materiality' }).click()
await page.locator('.mat-controls input[type=range]').fill('2.5')
await page.waitForTimeout(200)
await page.getByRole('button', { name: 'Decision Dashboard' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: `${out}/spine-dash2.png` })
await browser.close()
