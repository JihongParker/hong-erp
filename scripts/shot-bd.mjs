import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1680, height: 950 } })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
// hover near the pump jack (66vw, 78vh) to trigger the proximity wake
await page.mouse.move(1680 * 0.68, 950 * 0.76)
await page.waitForTimeout(700)
await page.screenshot({ path: `${out}/bd-wake.png` })
await page.emulateMedia({ colorScheme: 'dark' })
await page.mouse.move(1680 * 0.86, 950 * 0.14)
await page.waitForTimeout(700)
await page.screenshot({ path: `${out}/bd-dark.png` })
await browser.close()
