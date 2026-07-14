import { chromium } from 'playwright'
const out = process.argv[2]
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:4199/', { waitUntil: 'networkidle' })
await page.waitForTimeout(400)
await page.screenshot({ path: `${out}/overview.png`, fullPage: true })
await page.emulateMedia({ colorScheme: 'dark' })
await page.waitForTimeout(200)
await page.screenshot({ path: `${out}/overview-dark.png` })
await browser.close()
