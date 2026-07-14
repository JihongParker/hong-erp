import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1360, height: 960 } })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Hedge Budget' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/budget.png` })
await page.getByRole('button', { name: 'Hedge Accounting' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/accounting.png` })
await browser.close()
