import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1720, height: 1000 } })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
await page.waitForTimeout(1000)
await page.screenshot({ path: `${out}/v5-overview.png`, fullPage: true })
// tour step 1: whole deck glow
await page.getByRole('button', { name: /Take a look/ }).click()
await page.waitForTimeout(1500)
await page.screenshot({ path: `${out}/v5-tour1.png` })
// materiality material rows
await page.locator('.tour-close').click()
await page.locator('.nav-item', { hasText: 'Materiality' }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/v5-mat.png` })
await browser.close()
