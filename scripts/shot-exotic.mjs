import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1360, height: 980 } })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Hedge Instruments' }).click()
await page.getByRole('button', { name: /Double-KO quanto/ }).click()
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/exotic-base.png` })
const spot = page.locator('.ex-panel label', { hasText: 'WTI spot' }).locator('input')
await spot.fill('112')
await page.waitForTimeout(300)
await page.screenshot({ path: `${out}/exotic-danger.png` })
await browser.close()
