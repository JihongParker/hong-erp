import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.screenshot({ path: 'public/og.png' })
await browser.close()
