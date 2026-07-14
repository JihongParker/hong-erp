import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
await page.waitForTimeout(900)
await page.screenshot({ path: `${out}/v4-overview.png` })
await page.getByRole('button', { name: /Take a look/ }).click()
await page.waitForTimeout(1400)
await page.screenshot({ path: `${out}/v4-tour-dim.png` })
await page.getByRole('button', { name: 'Next →' }).click()
await page.waitForTimeout(1200)
await page.screenshot({ path: `${out}/v4-tour2.png` })
// close tour, check dashboard wide layout
await page.locator('.tour-close').click()
await page.waitForTimeout(300)
await page.screenshot({ path: `${out}/v4-budget-wide.png` })
await browser.close()
